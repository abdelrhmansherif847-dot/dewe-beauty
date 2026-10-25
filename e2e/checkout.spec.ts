import type { Page } from "@playwright/test";
import { addToBag, test, expect } from "./fixtures";

/*
 * These numbers get the fixed one-time code below from Supabase Auth's test
 * OTP map (supabase/config.toml and scripts/local-stack.sh). No SMS is sent.
 * Phone accounts are unique, so run against a freshly started stack.
 */
const ACCOUNT_PHONE = "010 0000 0101";
const TEST_OTP = "246810";

/** A random 010 number, so guest runs never hit the open-orders limit. */
const randomGuestPhone = () => `010${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

async function bagAndCheckout(page: Page) {
  // A well-stocked single-variant sample product, so repeated runs keep working.
  await page.goto("/products/cloud-milk-cleanser");
  await addToBag(page).click();
  const bag = page.getByRole("dialog", { name: "Shopping bag" });
  await bag.getByRole("link", { name: /Checkout/ }).click();
}

async function fillDelivery(page: Page, phone: string) {
  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel("Governorate").selectOption("C");
  await page.getByLabel("City or area").fill("Nasr City");
  await page.getByLabel("Street address").fill("12 Example Street");
}

test("a new customer signs up with a phone code and places a cash-on-delivery order", async ({ page, isMobile }) => {
  test.skip(isMobile, "the full order runs once, on desktop");

  await bagAndCheckout(page);
  await page.locator("main").getByRole("link", { name: "Create account" }).click();
  await expect(page).toHaveURL(/mode=sign-up/);

  // Invalid numbers are refused before anything is sent.
  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Mobile number").fill("+44 7700 900123");
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Egyptian mobile number");

  // Email stays empty: it is optional.
  await page.getByLabel("Mobile number").fill(ACCOUNT_PHONE);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();

  // The account only works after the code is accepted.
  await expect(page.getByTestId("otp-sent")).toContainText("+20 100 000 0101");
  await page.getByLabel("Code from the text message").fill("000000");
  await page.getByRole("button", { name: "Confirm number" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("wrong or has expired");
  await page.getByLabel("Code from the text message").fill(TEST_OTP);
  await page.getByRole("button", { name: "Confirm number" }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByLabel("Full name")).toHaveValue("Test Customer");
  await expect(page.getByLabel("Mobile number")).toHaveValue("+201000000101");
  await page.getByLabel("Governorate").selectOption("C");
  await page.getByLabel("City or area").fill("Nasr City");
  await page.getByLabel("Street address").fill("12 Example Street");
  await expect(page.getByRole("complementary", { name: "Order summary" })).toContainText("Cloud Milk Cleanser");
  await page.getByTestId("place-order").click();

  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}\?placed=1$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Thank you|order/i);
  await expect(page.locator("main")).toContainText("Cloud Milk Cleanser");
  await expect(page.locator("main")).toContainText("Cash on delivery");
  await expect(page.locator("main")).toContainText("420");
  await expect(page.getByTestId("guest-order-link")).toHaveCount(0);
  await expect(page.getByTestId("cart-count")).toHaveCount(0);

  await page.goto("/account");
  await expect(page.locator("main")).toContainText("+20 100 000 0101");
  await expect(page.getByRole("table")).toContainText(/#\d{5}/);

  // Sign out, then back in with the phone number and password.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/account/sign-in?next=/account");
  await page.getByLabel("Mobile number").fill("+20 100 000 0101");
  await page.getByLabel("Password").fill("wrong-password-here");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("don't match an account");
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("table")).toContainText(/#\d{5}/);
});

test("a guest checks out without an account or email, and only they can see the order", async ({
  page,
  browser,
  isMobile,
}) => {
  test.skip(isMobile, "the full order runs once, on desktop");
  const phone = randomGuestPhone();

  await bagAndCheckout(page);
  await page.getByTestId("continue-as-guest").filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/checkout\?as=guest$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Almost glowing");

  // Invalid phone number.
  await fillDelivery(page, "12345");
  await page.getByTestId("place-order").click();
  await expect(page.locator("#f-phone-error")).toContainText("Egyptian mobile number");

  // A governorate the store does not serve (a tampered option) is refused by the server.
  await page.getByLabel("Mobile number").fill(phone);
  await page.locator("#f-zone").evaluate((el: HTMLSelectElement) => {
    el.add(new Option("Nowhere", "XX"));
  });
  await page.getByLabel("Governorate").selectOption("XX");
  await page.getByTestId("place-order").click();
  await expect(page.getByTestId("checkout-error")).toContainText("don't deliver to that governorate");

  // A tampered price in the submitted cart is ignored: the database prices the order.
  await page.getByLabel("Governorate").selectOption("C");
  await page.locator('input[name="items"]').evaluate((el: HTMLInputElement) => {
    const lines = JSON.parse(el.value) as Record<string, unknown>[];
    el.value = JSON.stringify(lines.map((l) => ({ ...l, price_cents: 1, unit_price_cents: 1 })));
  });
  await page.getByTestId("place-order").click();

  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}\?placed=1$/);
  const orderUrl = new URL(page.url());
  const orderPath = orderUrl.pathname;
  await expect(page.locator("main")).toContainText("Cloud Milk Cleanser");
  await expect(page.getByTestId("order-total")).toContainText("420");
  await expect(page.locator("main")).toContainText("Cairo");
  const privateLink = await page.getByLabel("Private order link", { exact: true }).inputValue();
  expect(privateLink).toMatch(/\/orders\/[0-9a-f-]{36}\?key=[A-Za-z0-9_-]{43}$/);

  // The same browser can come back to the order (httpOnly cookie).
  await page.goto(orderPath);
  await expect(page.getByTestId("order-heading").filter({ visible: true })).toBeVisible();

  // A different browser with only the order address sees nothing.
  const stranger = await browser.newContext();
  const other = await stranger.newPage();
  await other.goto(orderPath);
  await expect(other).toHaveURL(/\/account\/sign-in/);
  await expect(other.locator("main")).not.toContainText("Cloud Milk Cleanser");

  // A wrong key is no better than none.
  const wrongKey = "A".repeat(43);
  await other.goto(`${orderPath}?key=${wrongKey}`);
  await expect(other).toHaveURL(/\/account\/sign-in/);

  // The private link works anywhere.
  const key = new URL(privateLink).searchParams.get("key");
  await other.goto(`${orderPath}?key=${key}`);
  await expect(other.getByTestId("order-heading").filter({ visible: true })).toBeVisible();
  await expect(other.locator("main")).toContainText("Cloud Milk Cleanser");
  await stranger.close();
});
