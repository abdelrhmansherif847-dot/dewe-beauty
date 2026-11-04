import { test, expect } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

/* Quick add on the default product cards (home, brand, related products and
   collections). Shop's collection cards are covered in shop.spec.ts. On
   phones (Pixel 7, a touch screen) the control sits under the details; with a
   mouse it is revealed over the image on hover. Both must add to the bag. */

const cards = (page: Page) => page.getByTestId("product-card").filter({ visible: true });
const card = (page: Page, name: string) => cards(page).filter({ has: page.getByRole("link", { name, exact: true }) });

/** What next/image renders with `fill`: an absolutely positioned <img>.
 *  The seed only has placeholder SVGs, so tests swap them in the browser. */
async function simulatePhotos(page: Page) {
  await page.evaluate(() => {
    for (const media of document.querySelectorAll(".product-card__media")) {
      const art = media.querySelector(":scope > svg");
      if (!art) continue;
      const img = document.createElement("img");
      img.alt = "";
      img.setAttribute("style", "position:absolute;height:100%;width:100%;inset:0;object-fit:cover");
      img.src =
        "data:image/svg+xml," +
        encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"><rect width="4" height="5" fill="#e9cfc3"/></svg>');
      art.replaceWith(img);
    }
  });
}

/** Press the control the way a shopper would: a finger on phones, a real
 *  mouse (hover, then click at its centre) on desktop. */
async function press(page: Page, control: Locator, isMobile: boolean) {
  await control.scrollIntoViewIfNeeded();
  const box = (await control.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (isMobile) {
    await page.touchscreen.tap(x, y);
  } else {
    await page.mouse.move(x, y);
    await expect(control).toBeVisible();
    await page.mouse.click(x, y);
  }
}

/** The control is on screen, unclipped and the topmost element at its centre. */
async function expectReachable(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  const result = await control.evaluate((el) => {
    const r = el.getBoundingClientRect();
    let top = r.top;
    let bottom = r.bottom;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.display !== "contents" && cs.overflow !== "visible") {
        const pr = p.getBoundingClientRect();
        top = Math.max(top, pr.top);
        bottom = Math.min(bottom, pr.bottom);
      }
    }
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { height: r.height, visible: bottom - top, onTop: !!hit && el.contains(hit) };
  });
  expect(result.height).toBeGreaterThanOrEqual(44);
  expect(result.visible).toBeGreaterThanOrEqual(result.height - 0.5);
  expect(result.onTop).toBe(true);
}

async function expectBagWith(page: Page, name: string, price: string) {
  const bag = page.getByRole("dialog", { name: "Shopping bag" });
  await expect(bag).toBeVisible();
  await expect(bag.getByTestId("cart-line")).toHaveCount(1);
  await expect(bag.getByTestId("cart-line")).toContainText(name);
  await expect(bag.getByTestId("cart-line")).toContainText(price);
}

for (const photos of [false, true]) {
  const variant = photos ? " (product photos)" : " (placeholder art)";

  test(`brand page quick add adds the right item and stays on the page${variant}`, async ({ page, isMobile }) => {
    await page.goto("/brands/dewlune");
    await expect(cards(page).first()).toBeVisible();
    if (photos) await simulatePhotos(page);
    const add = card(page, "Glow Veil Moisturiser").getByRole("button", {
      name: "Quick add Glow Veil Moisturiser to bag",
    });
    if (isMobile) {
      await expect(add).toBeVisible();
      await expectReachable(add);
    }
    await press(page, add, isMobile);
    await expectBagWith(page, "Glow Veil Moisturiser", "EGP 720");
    await expect(page).toHaveURL(/\/brands\/dewlune$/);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("cart-count").filter({ visible: true })).toHaveText("1");
  });

  test(`related products quick add adds the related item${variant}`, async ({ page, isMobile }) => {
    await page.goto("/products/rose-satin-lip-tint");
    const related = page.locator("section", { has: page.locator("#related") });
    await expect(related.getByTestId("product-card").first()).toBeVisible();
    if (photos) await simulatePhotos(page);
    const add = related.getByRole("button", { name: "Quick add Petal Lip Balm to bag" });
    await press(page, add, isMobile);
    await expectBagWith(page, "Petal Lip Balm", "EGP");
    await expect(page.getByRole("dialog", { name: "Shopping bag" })).not.toContainText("Rose Satin Lip Tint");
    await expect(page).toHaveURL(/\/products\/rose-satin-lip-tint$/);
  });
}

for (const [label, path] of [
  ["home", "/"],
  ["collection", "/collections/everyday-glow-edit"],
] as const) {
  for (const photos of [false, true]) {
    test(`${label} card controls are fully visible and reachable on touch${photos ? " (product photos)" : ""}`, async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, "touch layout");
      await page.goto(path);
      await expect(cards(page).first()).toBeVisible();
      if (photos) await simulatePhotos(page);
      const controls = page.locator(".product-card__quick > *").filter({ visible: true });
      const count = await controls.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const control = controls.nth(i);
        // Under the details, not over the image.
        const placed = await control.evaluate((el) => {
          const c = el.closest("[data-testid=product-card]")!;
          const r = el.getBoundingClientRect();
          return {
            belowBody: r.top >= c.querySelector(".product-card__body")!.getBoundingClientRect().bottom - 0.5,
            belowImage: r.top >= c.querySelector(".product-card__media")!.getBoundingClientRect().bottom - 0.5,
          };
        });
        expect(placed).toEqual({ belowBody: true, belowImage: true });
        if ((await control.evaluate((el) => el.tagName)) === "BUTTON") await expectReachable(control);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );
    });
  }
}

test("default cards line up their touch controls across a row", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch layout");
  await page.goto("/brands/dewlune");
  await expect(cards(page).first()).toBeVisible();
  // Dew Drop's name wraps to two lines and shows "2 sizes"; Glow Veil doesn't.
  const tops = await page
    .locator(".product-card__quick > *")
    .evaluateAll((els) => els.slice(0, 2).map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(tops[0]).toBe(tops[1]);
});

test("the image and title still open the product page", async ({ page, isMobile }) => {
  await page.goto("/brands/dewlune");
  const glow = card(page, "Glow Veil Moisturiser");
  const media = glow.locator(".product-card__media");
  await media.scrollIntoViewIfNeeded();
  const box = (await media.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 3;
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect(page).toHaveURL(/\/products\/glow-veil-moisturiser$/);

  await page.goto("/brands/dewlune");
  await card(page, "Cloud Milk Cleanser").getByRole("link", { name: "Cloud Milk Cleanser", exact: true }).click();
  await expect(page).toHaveURL(/\/products\/cloud-milk-cleanser$/);
});

test("quick add names start with the visible words and shade links aren't duplicated", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  const names = await page
    .locator(".product-card__quick button")
    .evaluateAll((els) => els.map((el) => [el.getAttribute("aria-label"), el.textContent?.trim()]));
  expect(names.length).toBeGreaterThan(0);
  for (const [label, text] of names) {
    expect(text).toBe("Quick add");
    expect(label).toMatch(/^Quick add .+ to bag$/);
  }
  // "Choose shade/size" repeats the card link, so it stays out of the
  // accessibility tree and the tab order.
  await expect(page.getByRole("link", { name: /^Choose (shade|size)$/ })).toHaveCount(0);
});

test("keyboard: Tab reaches quick add and Enter adds to bag", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard on desktop");
  await page.goto("/brands/dewlune");
  const title = card(page, "Dew Drop Hydrating Serum").getByRole("link", { name: "Dew Drop Hydrating Serum" });
  await title.focus();
  await page.keyboard.press("Tab");
  const add = page.getByRole("button", { name: "Quick add Glow Veil Moisturiser to bag" });
  await expect(add).toBeFocused();
  await expect(add).toBeVisible();
  await page.keyboard.press("Enter");
  await expectBagWith(page, "Glow Veil Moisturiser", "EGP 720");
});
