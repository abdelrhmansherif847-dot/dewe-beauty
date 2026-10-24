import { test as base, expect, type Page } from "@playwright/test";

/**
 * Fails a test when the page logs an error or throws, so hydration mismatches
 * and runtime exceptions do not slip through as passing tests. A test that
 * expects an error (such as a 404 document) lists it in `allowedErrors`.
 */
export const test = base.extend<{ allowedErrors: RegExp[]; consoleErrors: string[] }>({
  allowedErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedErrors }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
      });
      await use(errors);
      expect(
        errors.filter((e) => !allowedErrors.some((re) => re.test(e))),
        "browser errors",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * The product page's add-to-bag button. While React streams a refreshed copy
 * of a page, the incoming copy sits in a hidden container for a moment, so
 * only the visible button counts.
 */
export const addToBag = (page: Page) => page.getByTestId("add-to-bag").filter({ visible: true });
