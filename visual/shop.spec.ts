import { test, expect, type Page } from "@playwright/test";

/*
 * Shop All (Phase 5.1). Full-page screenshots at every width the redesign was
 * checked at, plus the filtered and keyboard-focus states. Phone and tablet
 * widths run in the touch (mobile) project, desktop widths in the desktop
 * project, so hover-only styles are judged on the right kind of device.
 */

const touchWidths = [390, 412, 768, 900];
const desktopWidths = [901, 1024, 1280, 1440];

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity),
  );
}

for (const width of [...touchWidths, ...desktopWidths]) {
  test(`shop at ${width}px`, async ({ page }, info) => {
    const touch = touchWidths.includes(width);
    test.skip(touch !== (info.project.name === "mobile"), "runs in the matching project");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shop");
    await expect(page.getByTestId("product-card")).toHaveCount(12);
    await settle(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    await expect(page).toHaveScreenshot(`shop-${width}.png`, { fullPage: true });
  });
}

test("shop with filters in use", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "desktop layout");
  await page.goto("/shop?category=skincare&brand=dewlune&in_stock=1");
  await expect(page.getByTestId("product-card")).toHaveCount(3);
  await settle(page);
  await expect(page).toHaveScreenshot("shop-filtered.png");
});

test("shop category index keyboard focus", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "desktop layout");
  await page.goto("/shop");
  await expect(page.getByTestId("product-card").first()).toBeVisible();
  const rail = page.getByRole("group", { name: "Category" });
  await page.keyboard.press("Tab");
  await rail.getByRole("button", { name: "All", exact: true }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(rail.getByRole("button", { name: "Makeup", exact: true })).toBeFocused();
  await expect(page.getByTestId("hover-highlight")).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("shop-index-focus.png", { clip: { x: 0, y: 0, width: 1440, height: 700 } });
});
