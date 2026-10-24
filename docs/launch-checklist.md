# Launch checklist

What still has to happen outside the code before DEWÉ BEAUTY takes real
orders. Nothing below is done unless it is ticked, and the store is not
launch-ready until step 7 passes on the deployed site.

Checked against the live project (`evqbayakbtccewggrqpf`) on 2026-10-24 via
its public `/auth/v1/settings`: email sign-in on, email auto-confirm off,
**phone sign-in off**, anonymous sign-ins off. No SMS provider is set up.

## 1. Apply the database migration

- [x] Apply `supabase/migrations/20261024234121_phone_accounts_guest_checkout.sql`
      to the live project. Applied on 2026-10-24 and recorded as version
      `20261024234121`, while the live database had no orders. It adds
      delivery zones, guest orders and the stricter phone format.

## 2. Phone sign-in and SMS codes (needed for accounts, not for guests)

Guest checkout works without any of this. Creating an account does not: until
the phone provider is on, the sign-up form says accounts aren't switched on
yet and points to guest checkout.

- [ ] Choose an SMS provider Supabase supports (Twilio, Twilio Verify,
      MessageBird, Vonage or Textlocal) and confirm it delivers to Egyptian
      numbers (010, 011, 012, 015). This costs money per message.
- [ ] Supabase dashboard, Authentication, Sign In / Providers, Phone: enable
      it, enter the provider's credentials, keep **Confirm phone** on.
- [ ] Optional: Authentication, Rate limits: review the SMS limit (default is
      low) and consider CAPTCHA on sign-up to stop SMS pumping.
- [ ] Test with a real phone: sign up, receive the code, confirm, sign out,
      sign in.

Turning phone sign-in on with **Confirm phone** off would let anyone create an
account for any number without proving they own it. The code never treats a
number as verified on its own, but this option is not recommended.

## 3. Email (deferred to the final launch phase)

Email is optional for customers and is not a login. Nothing is sent to it.

- [ ] Custom SMTP sender on the store's domain (Authentication, Emails, SMTP).
- [ ] Order confirmation emails (not built).
- [ ] If email sign-in or email verification is wanted later: set the Site
      URL and redirect allow list (`https://<domain>/auth/callback`), then
      build the flow. `/auth/callback` already handles the code exchange.

## 4. Delivery zones and fees

- [ ] In `public.delivery_zones`, set `is_active = false` for governorates
      the courier does not serve. All 27 start active.
- [ ] Set `store_settings.delivery_fee_cents` (default fee, currently 0) and
      per-zone `delivery_fee_cents` where it differs. Amounts are in
      piastres: EGP 60 is `6000`.
- [ ] Optional: `store_settings.free_delivery_threshold_cents`.

## 5. Abuse protection

- [ ] Guest orders are capped at three open orders per number per day in the
      database. Consider Vercel Firewall rate limiting or bot protection on
      `/checkout` as well.

## 6. Catalog and staff

- [ ] Replace the sample catalog (`is_sample`) with real brands, products,
      prices, stock and photography.
- [ ] Add staff: after they create an account, `insert into public.staff
      (user_id) values ('<uuid>');`.

## 7. Real end-to-end test on the deployed site

Previews share the production database, so do this once, deliberately, with
a real product and a real phone, then cancel the order.

- [ ] Guest order on the production URL: place it, open it from the private
      link on another device, confirm a different browser cannot see it.
- [ ] Account order on the production URL (after step 2).
- [ ] Cancel both test orders (`admin_set_order_status(<id>, 'cancelled')`)
      so stock is restored.
