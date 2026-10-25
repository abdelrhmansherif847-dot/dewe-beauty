import { describe, expect, it } from "vitest";
import { createGuestToken, guestTokenSchema } from "./guest-orders";
import { formatEgMobile, normalizeEgMobile } from "./phone";

describe("normalizeEgMobile", () => {
  it("accepts the usual ways of writing an Egyptian mobile number", () => {
    expect(normalizeEgMobile("01012345678")).toBe("+201012345678");
    expect(normalizeEgMobile("+20 101 234 5678")).toBe("+201012345678");
    expect(normalizeEgMobile("00201512345678")).toBe("+201512345678");
    expect(normalizeEgMobile("201112345678")).toBe("+201112345678");
    expect(normalizeEgMobile("+20 (0)122-345-6789")).toBe("+201223456789");
  });

  it("rejects other numbers and text", () => {
    for (const bad of ["01312345678", "0101234567", "010123456789", "+44 7700 900123", "call me", "", null, undefined]) {
      expect(normalizeEgMobile(bad)).toBeNull();
    }
  });

  it("formats for display", () => {
    expect(formatEgMobile("+201012345678")).toBe("+20 101 234 5678");
    expect(formatEgMobile("not a phone")).toBe("not a phone");
  });
});

describe("guest access tokens", () => {
  it("are 43-character base64url strings the database accepts", () => {
    const token = createGuestToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(guestTokenSchema.safeParse(token).success).toBe(true);
  });

  it("are unique", () => {
    const tokens = new Set(Array.from({ length: 200 }, createGuestToken));
    expect(tokens.size).toBe(200);
  });

  it("reject short or unsafe values", () => {
    expect(guestTokenSchema.safeParse("short").success).toBe(false);
    expect(guestTokenSchema.safeParse("a".repeat(42) + "/").success).toBe(false);
  });
});
