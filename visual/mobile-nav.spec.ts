import { test, expect, type Page } from "@playwright/test";

/*
 * The phone menu (Luxury Editorial). The closed header is already covered by
 * the page baselines in pages.spec.ts; these record the open menu at phone and
 * tablet-portrait widths, on a page where one menu item is current.
 */

async function openMenu(page: Page, path = "/brands") {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  // Wait for the panel to settle and every row to finish fading in.
  await page.waitForFunction(() => {
    const panel = document.querySelector<HTMLElement>("[role=dialog][aria-label=Menu]");
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".menu__nav li, .menu__links li"));
    return (
      panel !== null &&
      getComputedStyle(panel).transform === "none" &&
      rows.length > 0 &&
      rows.every((row) => getComputedStyle(row).opacity === "1")
    );
  });
  return menu;
}

test.describe("phone menu", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, "the menu belongs to the phone layout");
  });

  test("open menu looks right", async ({ page }) => {
    await openMenu(page);
    await expect(page).toHaveScreenshot("mobile-menu.png");
  });

  test.describe("at 390px", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("open menu looks right", async ({ page }) => {
      await openMenu(page);
      await expect(page).toHaveScreenshot("mobile-menu-390.png");
    });
  });

  test.describe("on a tablet in portrait", () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test("open menu looks right beside the dimmed page", async ({ page }) => {
      await openMenu(page);
      await expect(page).toHaveScreenshot("mobile-menu-768.png");
    });
  });
});

test.describe("narrowest desktop header", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!!isMobile, "desktop layout only");
  });

  for (const width of [901, 960, 980, 1024]) {
    test(`links keep clear of the centred wordmark at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/shop");
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll(".site-header__nav a"));
        const wordmark = document.querySelector(".site-header .wordmark")!.getBoundingClientRect();
        const firstAction = document.querySelector(".site-header__actions > *")!.getBoundingClientRect();
        return {
          oneLine: links.every((a) => a.getClientRects().length === 1),
          gap: wordmark.left - links.at(-1)!.getBoundingClientRect().right,
          actionsGap: firstAction.left - wordmark.right,
          offCentre: Math.abs((wordmark.left + wordmark.right) / 2 - innerWidth / 2),
          sideScroll: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(layout.oneLine).toBe(true);
      expect(layout.gap).toBeGreaterThanOrEqual(32);
      expect(layout.actionsGap).toBeGreaterThanOrEqual(32);
      expect(layout.offCentre).toBeLessThanOrEqual(1);
      expect(layout.sideScroll).toBe(false);
    });
  }
});
