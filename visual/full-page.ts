import { test, type Page } from "@playwright/test";

/*
 * Full-page screenshots that keep the phone's touch profile.
 *
 * On an emulated touch device (the "mobile" project, Pixel 7), Playwright's
 * `fullPage` and element screenshots make Chromium drop touch emulation for
 * the capture: `(hover: none)` flips to false and stays false for the rest of
 * the page's life. Pages then render their mouse layout, so mobile baselines
 * recorded that way never show touch-only styles (such as Quick add sitting
 * under the details), and captures taken before and after the flip differ.
 *
 * Instead, on touch projects this grows the viewport to the page's height,
 * takes an ordinary viewport screenshot (which keeps every emulated media
 * feature) and restores the viewport. Nothing on the site sizes itself from
 * the viewport height except `body { min-height: 100dvh }`, which then equals
 * the page height, so the layout is the one a phone scrolls through. It also
 * fails loudly if touch emulation is ever lost.
 *
 * Desktop projects keep Playwright's own `fullPage` capture, unchanged.
 */

type Clip = { x: number; y: number; width: number; height: number };

/** Same pixel rules the config gives toHaveScreenshot. */
export const IMAGE = { threshold: 0.2, maxDiffPixels: 0 } as const;

const isTouchProject = () => Boolean(test.info().project.use.hasTouch);

async function touchState(page: Page) {
  return page.evaluate(() => ({
    hoverNone: matchMedia("(hover: none)").matches,
    coarse: matchMedia("(pointer: coarse)").matches,
    height: document.documentElement.scrollHeight,
  }));
}

async function expectTouch(page: Page, when: string) {
  const state = await touchState(page);
  if (!state.hoverNone || !state.coarse) {
    throw new Error(`touch emulation lost ${when}: ${JSON.stringify(state)}`);
  }
  return state;
}

async function nextFrame(page: Page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** One full-page capture: touch-preserving on touch projects. */
export async function fullPageScreenshot(page: Page, options: { clip?: Clip } = {}): Promise<Buffer> {
  const shot = { animations: "disabled", caret: "hide", scale: "css", clip: options.clip } as const;
  if (!isTouchProject()) return page.screenshot({ ...shot, fullPage: true });

  const viewport = page.viewportSize()!;
  let { height } = await expectTouch(page, "before capture");
  try {
    // Growing the viewport can grow the page (100dvh), so settle on a height.
    for (let i = 0; i < 5; i++) {
      await page.setViewportSize({ width: viewport.width, height });
      await nextFrame(page);
      const now = (await expectTouch(page, "while sizing")).height;
      if (now === height) break;
      height = now;
    }
    const png = await page.screenshot(shot);
    await expectTouch(page, "after capture");
    return png;
  } finally {
    await page.setViewportSize(viewport);
    await nextFrame(page);
    await expectTouch(page, "after restoring the viewport");
  }
}

/**
 * Like toHaveScreenshot's stability wait: capture until two consecutive
 * shots are identical, so the result is the settled page.
 */
export async function stableFullPageScreenshot(page: Page, options: { clip?: Clip } = {}): Promise<Buffer> {
  let previous = await fullPageScreenshot(page, options);
  for (let i = 0; i < 5; i++) {
    const next = await fullPageScreenshot(page, options);
    if (next.equals(previous)) return next;
    previous = next;
  }
  throw new Error("full-page screenshot did not settle after 6 captures");
}
