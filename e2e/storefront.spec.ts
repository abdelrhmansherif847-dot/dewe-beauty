import { addToBag, test, expect } from "./fixtures";

test("home page introduces the brand and labels sample content", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("نضارتك. لمعتك. إنتِ.").first()).toBeVisible();
  await expect(page.getByText("Illustrative artwork. Product photography to follow.")).toBeVisible();
  await expect(page.getByTestId("product-card").first()).toBeVisible();
  // Sample catalog items carry a visible label.
  await expect(page.getByText("Sample product", { exact: true }).first()).toBeVisible();
});

test("shop search, filter and sort update the results and the URL", async ({ page, isMobile }) => {
  await page.goto("/shop");
  await expect(page.getByTestId("product-card").first()).toBeVisible();

  await page.getByLabel("Search the shop").fill("serum");
  await expect(page).toHaveURL(/q=serum/);
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await expect(page.getByTestId("product-card").first()).toContainText("Dew Drop Hydrating Serum");

  await page.getByLabel("Search the shop").fill("");
  await expect(page).not.toHaveURL(/q=/);

  if (isMobile) {
    await page.getByRole("button", { name: /^Filters/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await sheet.getByRole("button", { name: "Lips", exact: true }).click();
    await expect(page).toHaveURL(/category=lips/);
    await sheet.getByRole("button", { name: /Show/ }).click();
    await expect(sheet).toBeHidden();
  } else {
    await page.getByLabel("Filters").getByRole("button", { name: "Lips", exact: true }).click();
    await expect(page).toHaveURL(/category=lips/);
  }
  const cards = page.getByTestId("product-card");
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) await expect(card).toContainText(/Lip|Balm/);

  await page.getByLabel("Sort by").selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
});

test("product page handles shades, sold-out stock and add to bag", async ({ page }) => {
  await page.goto("/products/rose-satin-lip-tint");
  await expect(page.getByRole("heading", { level: 1, name: "Rose Satin Lip Tint" })).toBeVisible();

  await page.getByRole("radio", { name: "Dusty Petal, sold out" }).click();
  await expect(page.getByTestId("stock-line").filter({ visible: true })).toHaveText("Sold out");
  await expect(addToBag(page)).toBeDisabled();

  await page.getByRole("radio", { name: "Peach Silk" }).click();
  await expect(page.getByTestId("stock-line").filter({ visible: true })).toHaveText("In stock");
  await page.getByRole("group", { name: "Quantity" }).getByRole("button", { name: "Increase quantity" }).click();
  await addToBag(page).click();

  const bag = page.getByRole("dialog", { name: "Shopping bag" });
  await expect(bag).toBeVisible();
  await expect(bag.getByTestId("cart-line")).toHaveCount(1);
  await expect(bag.getByTestId("cart-line")).toContainText("Peach Silk");
  await expect(bag.getByRole("heading", { name: /Your bag/ })).toContainText("(2)");

  // The bag survives a reload.
  await page.keyboard.press("Escape");
  await expect(bag).toBeHidden();
  await page.reload();
  await expect(page.getByTestId("cart-count")).toHaveText("2");
});

test("bag page updates quantities and shows the empty state", async ({ page }) => {
  await page.goto("/products/petal-balm");
  await addToBag(page).click();
  await page.getByRole("dialog", { name: "Shopping bag" }).getByRole("link", { name: "View bag" }).click();
  await expect(page).toHaveURL(/\/cart$/);

  const line = page.locator("main").getByTestId("cart-line");
  await expect(line).toHaveCount(1);
  await line.getByRole("button", { name: "Increase quantity" }).click();
  await expect(line.getByLabel("Quantity", { exact: true }).last()).toHaveText("2");
  await line.getByRole("button", { name: /Remove/ }).click();
  await expect(page.locator("main").getByTestId("empty-bag")).toBeVisible();
});

test("header search suggests products", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Search" });
  await panel.getByLabel("Search products and brands").fill("tint");
  await expect(panel.getByRole("link", { name: /Rose Satin Lip Tint/ })).toBeVisible();
  await panel.getByRole("link", { name: /Rose Satin Lip Tint/ }).click();
  await expect(page).toHaveURL(/\/products\/rose-satin-lip-tint/);
});

test("mobile menu opens and navigates", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Brands" }).click();
  await expect(page).toHaveURL(/\/brands$/);
  await expect(menu).toBeHidden();
});

test.describe("not found", () => {
  test.use({ allowedErrors: [/status of 404/] });

  test("unknown product shows the not-found page", async ({ page }) => {
    const response = await page.goto(`/products/missing-${test.info().project.name}`);
    await expect(page.getByRole("heading", { level: 1, name: /isn.t in the shop/ })).toBeVisible();
    // The first visit streams the not-found page behind the loading shell, so
    // its status is 200 with noindex; later visits are served as a cached 404.
    if (response?.status() !== 404) {
      await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached();
    }
  });
});

test("checkout asks signed-out shoppers to sign in", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/account\/sign-in\?next=(%2F|\/)checkout/);
});
