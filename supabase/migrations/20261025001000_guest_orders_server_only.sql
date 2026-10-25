-- Guest orders are created by the storefront's server only.
--
-- place_guest_cod_order() was callable by anon through the REST API, so a
-- script holding the public key could skip the site (and any rate limit in
-- front of it) and create orders directly. The checkout server action now
-- calls it with the secret key, which runs as service_role.
--
-- Only grants change: the function body, its validation, stock locking,
-- idempotency and the cod_enabled switch are untouched. Signed-in customers
-- still use place_cod_order(), and get_guest_order() stays public because it
-- returns nothing without the order's secret token.

revoke all on function public.place_guest_cod_order(jsonb, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.place_guest_cod_order(jsonb, jsonb, uuid, text) to service_role;
