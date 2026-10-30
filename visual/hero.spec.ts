import { test, expect, type Browser, type Page } from "@playwright/test";

/*
 * Dedicated checks for the Luxury Editorial hero (Aceternity spotlight).
 *
 * The page-level baselines in pages.spec.ts use Playwright's default colour
 * tolerance, which is too coarse to see a light this faint. These tests
 * instead render three states of the same page and compare them pixel by
 * pixel in the browser:
 *
 *   original  light hidden, eyebrow in its pre-redesign colour
 *   unlit     light hidden, current hero styles
 *   lit       the hero as shipped
 *
 * and check that the original still matches the committed home baseline,
 * that the light is visible but subtle, that nothing outside the hero
 * changed, and that the light holds still under reduced motion.
 *
 * Determinism: the CSS entrance animation on `.hero__fade` is switched off
 * before capturing. It makes Chromium rasterise the hero buttons and fact
 * list in one of two ways at random (a sub-pixel anti-aliasing difference,
 * layout identical), which is the "Explore brands" jitter. It is timing
 * control, not a mask: every pixel is still compared.
 */

const NO_ENTRANCE = ".hero__fade{animation:none!important}";
const ORIGINAL =
  ".hero__light{visibility:hidden!important}.hero__copy .eyebrow{color:var(--rose-ink)!important}";
const UNLIT = ".hero__light{visibility:hidden!important}";

async function openHome(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: NO_ENTRANCE });
  // The light fades in once (Motion); wait until it is fully on.
  await page.waitForFunction(() => {
    const light = document.querySelector(".hero__light > div");
    return light !== null && getComputedStyle(light).opacity === "1";
  });
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== "running" ||
          a.effect?.getComputedTiming().iterations === Infinity,
      ),
  );
}

async function capture(page: Page, css = "") {
  const tag = css ? await page.addStyleTag({ content: css }) : null;
  const shot = await page.screenshot({
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
  await tag?.evaluate((el) => (el as Element).remove());
  return shot;
}

async function heroBounds(page: Page) {
  return page.evaluate(() => {
    const r = document.querySelector(".hero")!.getBoundingClientRect();
    return {
      top: Math.round(r.top + scrollY),
      bottom: Math.round(r.bottom + scrollY),
    };
  });
}

type Diff = {
  width: number;
  height: number;
  changed: number;
  changedOutside: number;
  maxDelta: number;
  meanDeltaChanged: number;
  box: { top: number; bottom: number } | null;
};

/** Pixel diff of two PNGs, computed in a blank browser page (no image library needed). */
async function diff(
  browser: Browser,
  a: Buffer,
  b: Buffer,
  inside: { top: number; bottom: number },
): Promise<Diff> {
  const page = await browser.newPage();
  try {
    return await page.evaluate(
      async ([a, b, inside]) => {
        const load = async (src: string) => {
          const img = new Image();
          img.src = `data:image/png;base64,${src}`;
          await img.decode();
          const canvas = new OffscreenCanvas(img.width, img.height);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, img.width, img.height);
        };
        const [x, y] = await Promise.all([load(a), load(b)]);
        if (x.width !== y.width || x.height !== y.height)
          throw new Error(
            `size ${x.width}x${x.height} vs ${y.width}x${y.height}`,
          );
        let changed = 0;
        let changedOutside = 0;
        let maxDelta = 0;
        let sum = 0;
        let top = Infinity;
        let bottom = -1;
        for (let i = 0; i < x.data.length; i += 4) {
          const d = Math.max(
            Math.abs(x.data[i] - y.data[i]),
            Math.abs(x.data[i + 1] - y.data[i + 1]),
            Math.abs(x.data[i + 2] - y.data[i + 2]),
          );
          if (!d) continue;
          const row = Math.floor(i / 4 / x.width);
          changed++;
          sum += d;
          maxDelta = Math.max(maxDelta, d);
          top = Math.min(top, row);
          bottom = Math.max(bottom, row);
          if (row < inside.top || row >= inside.bottom) changedOutside++;
        }
        return {
          width: x.width,
          height: x.height,
          changed,
          changedOutside,
          maxDelta,
          meanDeltaChanged: changed ? sum / changed : 0,
          box: changed ? { top, bottom } : null,
        };
      },
      [a.toString("base64"), b.toString("base64"), inside] as const,
    );
  } finally {
    await page.close();
  }
}

test("the original hero still matches the committed home baseline", async ({
  page,
}) => {
  // Writing this snapshot would overwrite the page baseline from pages.spec.ts.
  test.skip(
    test.info().config.updateSnapshots === "all",
    "never rewrites the shared home baseline",
  );
  await openHome(page);
  const original = await capture(page, ORIGINAL);
  // Same tolerance the page baselines were recorded with.
  expect(original).toMatchSnapshot("home.png", { threshold: 0.2 });
});

test("the spotlight is visible, subtle and confined to the hero", async ({
  page,
  browser,
}) => {
  await openHome(page);
  const hero = await heroBounds(page);
  const original = await capture(page, ORIGINAL);
  const unlit = await capture(page, UNLIT);
  const lit = await capture(page);

  const light = await diff(browser, unlit, lit, hero);
  const heroArea = light.width * (hero.bottom - hero.top);
  test
    .info()
    .annotations.push({ type: "light", description: JSON.stringify(light) });
  // Visible: a real share of the hero is lit (about 19% on desktop, 27% on phones)...
  expect(light.changed / heroArea).toBeGreaterThan(0.1);
  // ...but subtle: a wash of a few colour levels, never a glare.
  expect(light.maxDelta).toBeGreaterThanOrEqual(4);
  expect(light.maxDelta).toBeLessThanOrEqual(40);
  expect(light.meanDeltaChanged).toBeLessThan(15);
  expect(light.changedOutside).toBe(0);

  // Everything the redesign changed (light and eyebrow ink) stays in the hero.
  const all = await diff(browser, original, lit, hero);
  test
    .info()
    .annotations.push({ type: "redesign", description: JSON.stringify(all) });
  expect(all.changed).toBeGreaterThan(0);
  expect(all.changedOutside).toBe(0);
});

test("the lit hero matches the reviewed design", async ({ page }) => {
  await openHome(page);
  const hero = await heroBounds(page);
  const width = page.viewportSize()!.width;
  // Clip from the unscrolled full page: an element screenshot would scroll
  // and let the sticky header overlap the top of the hero.
  await expect(page).toHaveScreenshot("hero.png", {
    fullPage: true,
    clip: { x: 0, y: hero.top, width, height: hero.bottom - hero.top },
    animations: "disabled",
    threshold: 0.01,
    maxDiffPixels: 0,
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the light holds still", async ({ page, browser }) => {
    await openHome(page);
    const hero = await heroBounds(page);
    const first = await capture(page);
    await page.waitForTimeout(2_000);
    const second = await capture(page);
    expect((await diff(browser, first, second, hero)).changed).toBe(0);
  });
});

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the light drifts slowly", async ({ page }) => {
    await openHome(page);
    const beam = page.locator(".hero__light > div > div").first();
    const before = await beam.evaluate(
      (el) => new DOMMatrix(getComputedStyle(el).transform).m41,
    );
    await page.waitForTimeout(1_500);
    const after = await beam.evaluate(
      (el) => new DOMMatrix(getComputedStyle(el).transform).m41,
    );
    expect(Math.abs(after - before)).toBeGreaterThan(1);
    // 70px each way over 12s: well under 20px in 1.5s.
    expect(Math.abs(after - before)).toBeLessThan(20);
  });
});

test("the light never takes pointer events or focus", async ({ page }) => {
  await openHome(page);
  const light = await page.evaluate(() => {
    const layer = document.querySelector(".hero__light")!;
    return {
      pointerEvents: [layer, ...layer.querySelectorAll("*")].every(
        (e) => getComputedStyle(e).pointerEvents === "none",
      ),
      hidden: layer.firstElementChild?.getAttribute("aria-hidden"),
      focusable: layer.querySelectorAll("a,button,input,[tabindex]").length,
    };
  });
  expect(light).toEqual({ pointerEvents: true, hidden: "true", focusable: 0 });
  for (const name of ["Shop the glow edit", "Explore brands"]) {
    const link = page.getByRole("link", { name, exact: true });
    const box = (await link.boundingBox())!;
    const hit = await page.evaluate(
      ([x, y]) =>
        document.elementFromPoint(x, y)?.closest("a")?.textContent?.trim(),
      [box.x + box.width / 2, box.y + box.height / 2] as const,
    );
    expect(hit).toBe(name);
  }
});
