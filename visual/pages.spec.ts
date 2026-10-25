import { test, expect, type Page } from "@playwright/test";
import { addToBag } from "../e2e/fixtures";

const pages = [
  { name: "home", path: "/" },
  { name: "shop", path: "/shop" },
  { name: "brand", path: "/brands/dewlune" },
  { name: "product", path: "/products/rose-satin-lip-tint" },
  { name: "checkout", path: "/checkout" },
  { name: "sign-in", path: "/account/sign-in" },
];

// Elements whose computed styles must not change when the CSS foundation does.
const styleProbes = [
  "body",
  "h1",
  "h2",
  "p",
  "a",
  "button",
  "img, svg",
  ".container",
  "header",
  "footer",
  "[data-testid=product-card]",
];
const styleProps = [
  "display",
  "position",
  "box-sizing",
  "width",
  "max-width",
  "margin",
  "padding",
  "border",
  "border-radius",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "color",
  "background-color",
  "text-decoration",
  "box-shadow",
];

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  // Let finite entrance animations (CSS or Motion) finish, so the screenshot
  // shows the settled page rather than whatever frame Playwright cancels to.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity),
  );
}

async function computedStyles(page: Page) {
  return page.evaluate(
    ([selectors, props]) =>
      Object.fromEntries(
        selectors.map((sel) => {
          const el = document.querySelector(sel);
          if (!el) return [sel, null];
          const cs = getComputedStyle(el);
          return [
            sel,
            Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])),
          ];
        }),
      ),
    [styleProbes, styleProps] as const,
  );
}

for (const { name, path } of pages) {
  test(`${name} looks unchanged`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    await expect.soft(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
    expect(JSON.stringify(await computedStyles(page), null, 2)).toMatchSnapshot(
      `${name}.styles.json`,
    );
  });
}

test("bag drawer looks unchanged", async ({ page }) => {
  await page.goto("/products/petal-balm");
  await settle(page);
  await addToBag(page).click();
  const drawer = page.getByRole("dialog", { name: "Shopping bag" });
  await expect(drawer).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("bag-drawer.png");
});
