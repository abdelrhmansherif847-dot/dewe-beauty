import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

/* Shop All (Phase 5.1): the category index, refine column, filter tokens,
   sorting and quick add, all against the seeded local catalogue. */

const cards = (page: Page) => page.getByTestId("product-card").filter({ visible: true });
const rail = (page: Page) => page.getByRole("group", { name: "Category" });

/** Lowest price on a card, in pounds ("From EGP 1,200" -> 1200). */
async function cardPrices(page: Page) {
  const texts = await page.locator("[data-testid=product-card] .product-card__price > span:first-child").allInnerTexts();
  return texts.map((t) => Number(t.replace(/[^0-9.]/g, "")));
}

test("category index filters by category and keeps the other filters", async ({ page }) => {
  await page.goto("/shop?brand=dewlune");
  await expect(cards(page).first()).toBeVisible();
  await expect(rail(page).getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");

  await rail(page).getByRole("button", { name: "Skincare", exact: true }).click();
  await expect(page).toHaveURL(/category=skincare/);
  await expect(page).toHaveURL(/brand=dewlune/);
  await expect(rail(page).getByRole("button", { name: "Skincare", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(rail(page).locator("[aria-pressed=true]")).toHaveCount(1);
  await expect(cards(page)).toHaveCount(3);
  for (const card of await cards(page).all()) await expect(card).toContainText("Dewlune");

  // Pressing the current category again shows every category.
  await rail(page).getByRole("button", { name: "Skincare", exact: true }).click();
  await expect(page).not.toHaveURL(/category=/);
  await expect(rail(page).getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("category index works from the keyboard with a visible focus and highlight", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard check runs on desktop");
  await page.goto("/shop");
  await expect(cards(page).first()).toBeVisible();
  await page.keyboard.press("Tab");
  await rail(page).getByRole("button", { name: "All", exact: true }).focus();
  await page.keyboard.press("Tab");
  const skincare = rail(page).getByRole("button", { name: "Skincare", exact: true });
  await expect(skincare).toBeFocused();
  expect(await skincare.evaluate((el) => el.matches(":focus-visible") && getComputedStyle(el).outlineStyle)).toBe("solid");
  await expect(page.getByTestId("hover-highlight")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/category=skincare/);
  await expect(skincare).toHaveAttribute("aria-pressed", "true");
});

test("refine column filters by brand and stock, with removable tokens", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones use the Filters sheet, covered in storefront.spec.ts");
  await page.goto("/shop");
  await expect(cards(page)).toHaveCount(12);
  const refine = page.getByRole("complementary", { name: "Filters" });

  await refine.getByRole("button", { name: "Mochéra", exact: true }).click();
  await expect(page).toHaveURL(/brand=mochera/);
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).filter({ hasText: "Soft Focus Eye Quad" })).toContainText("Sold out");

  // The switch follows the URL, so it flips once the results update.
  await refine.getByLabel("In stock only").click();
  await expect(refine.getByLabel("In stock only")).toBeChecked();
  await expect(page).toHaveURL(/in_stock=1/);
  await expect(cards(page)).toHaveCount(2);
  await expect(cards(page).filter({ hasText: "Soft Focus Eye Quad" })).toHaveCount(0);

  await page.getByRole("button", { name: "Remove filter: Mochéra" }).click();
  await expect(page).not.toHaveURL(/brand=/);
  await expect(page).toHaveURL(/in_stock=1/);
  await expect(cards(page)).toHaveCount(11);

  await page.getByLabel("Search the shop").fill("lip");
  await expect(page).toHaveURL(/q=lip/);
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByLabel("Search the shop")).toHaveValue("");
  await expect(cards(page)).toHaveCount(12);
});

test("sorting orders the cards by price", async ({ page }) => {
  await page.goto("/shop");
  await expect(cards(page)).toHaveCount(12);
  await page.getByLabel("Sort by").selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect.poll(async () => {
    const prices = await cardPrices(page);
    return prices.length === 12 && prices.every((p, i) => i === 0 || prices[i - 1] <= p);
  }).toBe(true);
  await page.getByLabel("Sort by").selectOption("price-desc");
  await expect(page).toHaveURL(/sort=price-desc/);
  await expect.poll(async () => {
    const prices = await cardPrices(page);
    return prices.length === 12 && prices.every((p, i) => i === 0 || prices[i - 1] >= p);
  }).toBe(true);
});

test("quick add from the shop fills the bag and updates the count", async ({ page }) => {
  await page.goto("/shop");
  await expect(cards(page).first()).toBeVisible();

  // Sold out and multi-shade products don't offer a quick add.
  await expect(cards(page).filter({ hasText: "Soft Focus Eye Quad" }).getByRole("button")).toHaveCount(0);
  await expect(cards(page).filter({ hasText: "Rose Satin Lip Tint" }).getByRole("link", { name: "Rose Satin Lip Tint" })).toHaveAttribute(
    "href",
    "/products/rose-satin-lip-tint",
  );

  const add = page.getByRole("button", { name: "Quick add Glow Veil Moisturiser to bag" });
  await expect(add).toBeVisible();
  await add.click();
  const bag = page.getByRole("dialog", { name: "Shopping bag" });
  await expect(bag).toBeVisible();
  await expect(bag.getByTestId("cart-line")).toHaveCount(1);
  await expect(bag.getByTestId("cart-line")).toContainText("Glow Veil Moisturiser");
  await expect(bag.getByTestId("cart-line")).toContainText("EGP 720");
  await page.keyboard.press("Escape");
  await expect(bag).toBeHidden();
  await expect(page.getByTestId("cart-count").filter({ visible: true })).toHaveText("1");
});

test("product cards open their product page", async ({ page }) => {
  await page.goto("/shop");
  await cards(page).filter({ hasText: "Petal Lip Balm" }).getByRole("link", { name: "Petal Lip Balm" }).click();
  await expect(page).toHaveURL(/\/products\/petal-balm$/);
  await expect(page.getByRole("heading", { level: 1, name: "Petal Lip Balm" })).toBeVisible();
});

test("a search with no matches offers the whole shop", async ({ page }) => {
  await page.goto("/shop?q=zzzz");
  // Streamed pages briefly hold a hidden copy, so only the visible one counts.
  await expect(page.getByTestId("shop-empty").filter({ visible: true })).toBeVisible();
  await page.getByRole("link", { name: "See the whole shop" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(cards(page)).toHaveCount(12);
});

test("shop has no sideways scroll and the index scrolls on its own", async ({ page }) => {
  await page.goto("/shop");
  await expect(cards(page).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  for (const name of ["All", "Skincare", "Makeup", "Lips", "Fragrance", "Body & Hair"]) {
    await expect(rail(page).getByRole("button", { name, exact: true })).toBeAttached();
  }
});

test("the current category stays in view in the sideways index", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the index only scrolls on phones");
  await page.goto("/shop?category=body");
  const current = rail(page).getByRole("button", { name: "Body & Hair", exact: true });
  await expect(current).toHaveAttribute("aria-pressed", "true");
  await expect(current).toBeInViewport({ ratio: 1 });
});
