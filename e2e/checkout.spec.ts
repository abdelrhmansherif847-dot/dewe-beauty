import { addToBag, test, expect } from "./fixtures";

test("a new customer places a cash-on-delivery order", async ({ page, isMobile }) => {
  test.skip(isMobile, "the full order runs once, on desktop");
  const email = `e2e-${Date.now()}@example.com`;

  // A well-stocked single-variant sample product, so repeated runs keep working.
  await page.goto("/products/cloud-milk-cleanser");
  await addToBag(page).click();
  const bag = page.getByRole("dialog", { name: "Shopping bag" });
  await bag.getByRole("link", { name: /Checkout/ }).click();

  await expect(page).toHaveURL(/\/account\/sign-in/);
  await page.getByRole("link", { name: "Create account" }).click();
  await expect(page).toHaveURL(/mode=sign-up/);
  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByLabel("Full name")).toHaveValue("Test Customer");
  await page.getByLabel("Mobile number").fill("+20 100 000 0000");
  await page.getByLabel("Street address").fill("12 Example Street");
  await page.getByLabel("City").fill("Cairo");
  await expect(page.getByRole("complementary", { name: "Order summary" })).toContainText("Cloud Milk Cleanser");
  await page.getByTestId("place-order").click();

  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}\?placed=1$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Thank you|order/i);
  await expect(page.locator("main")).toContainText("Cloud Milk Cleanser");
  await expect(page.locator("main")).toContainText("Cash on delivery");
  await expect(page.locator("main")).toContainText("420");

  // The bag is emptied once the order exists.
  await expect(page.getByTestId("cart-count")).toHaveCount(0);

  await page.goto("/account");
  await expect(page.getByRole("table")).toContainText(/#\d{5}/);
});
