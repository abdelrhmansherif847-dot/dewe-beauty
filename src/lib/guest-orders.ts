import { z } from "zod";

/*
 * Guest orders are protected by a random access token. The buyer's browser
 * generates it with the checkout form (so a retried submission reuses it),
 * the database stores only its SHA-256 hash, and the server keeps the token
 * in an httpOnly cookie scoped to /orders. Knowing an order id or number is
 * never enough to read a guest order.
 */

/** 32 random bytes in base64url: 43 characters. Matches the database check. */
export const guestTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43,128}$/);

export function createGuestToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function guestCookieName(orderId: string): string {
  return `dewe_guest_${orderId}`;
}

export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;
