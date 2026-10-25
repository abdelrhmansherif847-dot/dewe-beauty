-- Phone rules, delivery zones, phone-first profiles and guest orders.
-- Runs after 01_security_and_orders.sql. Each failing assertion aborts the run.
\set ON_ERROR_STOP 1
\set QUIET 1

-- ------------------------------------------------------------ phones -----
do $$ begin
  assert private.normalize_eg_mobile('01012345678') = '+201012345678', 'local format';
  assert private.normalize_eg_mobile('+20 101 234 5678') = '+201012345678', 'international with spaces';
  assert private.normalize_eg_mobile('00201512345678') = '+201512345678', '00 prefix';
  assert private.normalize_eg_mobile('201112345678') = '+201112345678', 'auth.users format (no plus)';
  assert private.normalize_eg_mobile('+20 (0)122-345-6789') = '+201223456789', 'trunk zero and punctuation';
  assert private.normalize_eg_mobile('01312345678') is null, 'unknown mobile prefix rejected';
  assert private.normalize_eg_mobile('0101234567') is null, 'too short';
  assert private.normalize_eg_mobile('010123456789') is null, 'too long';
  assert private.normalize_eg_mobile('+44 7700 900123') is null, 'non-Egyptian number rejected';
  assert private.normalize_eg_mobile('call me') is null, 'text rejected';
  assert private.normalize_eg_mobile(null) is null, 'null rejected';
end $$;

-- ------------------------------------------------- phone-first profile ---
insert into auth.users (id, phone, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', '201012345678', '{"full_name":"Phone Only"}'),
  ('00000000-0000-0000-0000-0000000000e2', '201112345678', '{"full_name":"With Email","contact_email":" Salma@Example.COM "}'),
  ('00000000-0000-0000-0000-0000000000e3', '201212345678', '{"contact_email":"not-an-email"}');

do $$ begin
  assert (select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000e1') = '+201012345678',
    'profile phone comes from the auth account';
  assert (select email from public.profiles where id = '00000000-0000-0000-0000-0000000000e1') is null,
    'email is optional';
  assert (select email from public.profiles where id = '00000000-0000-0000-0000-0000000000e2') = 'salma@example.com',
    'optional contact email is trimmed and lower-cased';
  assert (select email from public.profiles where id = '00000000-0000-0000-0000-0000000000e3') is null,
    'an invalid contact email never blocks account creation';
end $$;

-- ------------------------------------------------------ delivery zones ----
update public.delivery_zones set is_active = false where code = 'WAD';
update public.delivery_zones set delivery_fee_cents = 7500 where code = 'ALX';
update public.store_settings set delivery_fee_cents = 5000;

begin;
set local role anon;
do $$ begin
  assert (select count(*) from public.delivery_zones) = 26, 'anon sees active zones only';
  assert not exists (select 1 from public.delivery_zones where code = 'WAD'), 'inactive zone hidden';
  begin
    update public.delivery_zones set is_active = true where code = 'WAD';
    assert not exists (select 1 from public.delivery_zones where code = 'WAD'), 'anon re-enabled a zone';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.delivery_zones set delivery_fee_cents = 0 where code = 'C';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;
do $$ begin
  assert (select delivery_fee_cents from public.delivery_zones where code = 'C') is null, 'anon cannot change fees';
end $$;

-- --------------------------------------------------------- guest orders ---
create temporary table guest_fixture (k text primary key, v text);
grant select, insert on guest_fixture to anon, authenticated, service_role;
insert into guest_fixture values
  ('token', 'guest-token-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
  ('other_token', 'guest-token-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'),
  ('key', '22222222-2222-2222-2222-222222222222');

-- Guest orders are placed by the storefront server with the secret key
-- (service_role); 03_guest_rpc_grants.sql proves anon cannot place them.
begin;
set local role service_role;
do $$
declare
  v_token text := (select v from guest_fixture where k = 'token');
  v_other text := (select v from guest_fixture where k = 'other_token');
  v_key uuid := (select v::uuid from guest_fixture where k = 'key');
  v_serum uuid := (select id from public.product_variants where sku = 'SMP-DLN-SER-30');
  v_stock integer := (select stock from public.product_variants where sku = 'SMP-DLN-SER-30');
  v_ship jsonb := '{"customer_name":"Guest Buyer","phone":"010 1111 2222","address_line1":"5 Corniche Rd","city":"Smouha","zone":"alx","email":""}';
  v_order record;
  v_again record;
begin
  -- Price smuggling is ignored and the zone fee applies.
  select * into v_order from public.place_guest_cod_order(
    jsonb_build_array(jsonb_build_object('variant_id', v_serum, 'quantity', 1, 'price_cents', 1, 'unit_price_cents', 1)),
    v_ship, v_key, v_token);
  insert into guest_fixture values ('order_id', v_order.order_id::text), ('order_number', v_order.order_number::text);

  -- Duplicate submission: same key and token returns the same order, once.
  select * into v_again from public.place_guest_cod_order(
    jsonb_build_array(jsonb_build_object('variant_id', v_serum, 'quantity', 1)), v_ship, v_key, v_token);
  assert v_again.order_id = v_order.order_id, 'guest retry returns the original order';
  assert (select stock from public.product_variants where id = v_serum) = v_stock - 1, 'retry does not move stock twice';

  -- The same key with someone else's token is refused, not merged.
  begin
    perform public.place_guest_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', v_serum, 'quantity', 1)), v_ship, v_key, v_other);
    raise exception 'reused key with a different token';
  exception when raise_exception then
    assert sqlerrm like 'invalid_request:%', sqlerrm;
  end;

  begin
    perform public.place_guest_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', v_serum, 'quantity', 1)), v_ship, gen_random_uuid(), 'short');
    raise exception 'weak token accepted';
  exception when raise_exception then
    assert sqlerrm like 'invalid_request:%', sqlerrm;
  end;

  begin
    perform public.place_guest_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', v_serum, 'quantity', 1)),
      v_ship || '{"zone":"WAD"}', gen_random_uuid(), v_other);
    raise exception 'inactive zone accepted';
  exception when raise_exception then
    assert sqlerrm = 'unsupported_location', sqlerrm;
  end;

  begin
    perform public.place_guest_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', v_serum, 'quantity', 1)),
      v_ship || '{"zone":"XX"}', gen_random_uuid(), v_other);
    raise exception 'unknown zone accepted';
  exception when raise_exception then
    assert sqlerrm = 'unsupported_location', sqlerrm;
  end;

  begin
    perform public.place_guest_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', v_serum, 'quantity', 1)),
      v_ship - 'zone', gen_random_uuid(), v_other);
    raise exception 'missing zone accepted';
  exception when raise_exception then
    assert sqlerrm = 'unsupported_location', sqlerrm;
  end;

  begin
    perform public.place_guest_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', v_serum, 'quantity', 1)),
      v_ship || '{"phone":"+44 7700 900123"}', gen_random_uuid(), v_other);
    raise exception 'foreign phone accepted';
  exception when raise_exception then
    assert sqlerrm = 'invalid_phone', sqlerrm;
  end;

  begin
    perform public.place_guest_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', v_serum, 'quantity', 1)),
      v_ship || '{"email":"nope"}', gen_random_uuid(), v_other);
    raise exception 'bad email accepted';
  exception when raise_exception then
    assert sqlerrm = 'invalid_shipping', sqlerrm;
  end;

  begin
    perform public.place_guest_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', (select id from public.product_variants where sku = 'SMP-RSL-TNT-02'), 'quantity', 1)),
      v_ship, gen_random_uuid(), v_other);
    raise exception 'guest bought a sold-out variant';
  exception when raise_exception then
    assert sqlerrm like 'insufficient_stock:%', sqlerrm;
  end;
end $$;
commit;

-- The buyer's browser reads its order through get_guest_order as anon.
begin;
set local role anon;
do $$
declare
  v_token text := (select v from guest_fixture where k = 'token');
  v_other text := (select v from guest_fixture where k = 'other_token');
  v_order_id uuid := (select v::uuid from guest_fixture where k = 'order_id');
  v_read jsonb;
begin
  -- Anon has no read access to the orders table at all.
  assert (select count(*) from public.orders) = 0, 'anon cannot list orders';

  v_read := public.get_guest_order(v_order_id, v_token);
  assert v_read is not null, 'guest reads own order with token';
  assert (v_read ->> 'subtotal_cents')::int = 65000, 'guest subtotal uses the database price';
  assert (v_read ->> 'delivery_fee_cents')::int = 7500, 'zone fee overrides the store default';
  assert (v_read ->> 'total_cents')::int = 72500, 'total = subtotal + zone fee';
  assert v_read ->> 'phone' = '+201011112222', 'phone stored in E.164';
  assert v_read ->> 'region' = 'Alexandria', 'zone name recorded';
  assert v_read ->> 'email' is null, 'blank email stored as null';
  assert jsonb_array_length(v_read -> 'order_items') = 1, 'items included';
  assert not (v_read ? 'guest_access_hash') and not (v_read ? 'user_id'), 'no secrets returned';

  assert public.get_guest_order(v_order_id, v_other) is null, 'wrong token reads nothing';
  assert public.get_guest_order(v_order_id, '') is null, 'empty token reads nothing';
  assert public.get_guest_order(v_order_id, null) is null, 'null token reads nothing';
  assert public.get_guest_order(gen_random_uuid(), v_token) is null, 'token is bound to its order';

  -- Anon still cannot use the customer entry point or the private helper.
  begin
    perform public.place_cod_order('[]'::jsonb, '{}'::jsonb, gen_random_uuid());
    raise exception 'anon could call place_cod_order';
  exception when insufficient_privilege then null;
  end;
  begin
    perform private.create_cod_order(null, sha256('x'::bytea), '[]'::jsonb, '{}'::jsonb, gen_random_uuid());
    raise exception 'anon could call private.create_cod_order';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- Rate limit: at most three open guest orders per number per day.
begin;
set local role service_role;
do $$
declare
  v_ok uuid := (select id from public.product_variants where sku = 'SMP-DLN-CLN-150');
  v_ship jsonb := '{"customer_name":"Guest Buyer","phone":"+201011112222","address_line1":"5 Corniche Rd","city":"Smouha","zone":"ALX"}';
  i integer;
begin
  for i in 1..2 loop
    perform public.place_guest_cod_order(jsonb_build_array(jsonb_build_object('variant_id', v_ok, 'quantity', 1)),
      v_ship, gen_random_uuid(), 'guest-token-rate-limit-' || i || '-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  end loop;
  begin
    perform public.place_guest_cod_order(jsonb_build_array(jsonb_build_object('variant_id', v_ok, 'quantity', 1)),
      v_ship, gen_random_uuid(), 'guest-token-rate-limit-4-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    raise exception 'fourth open guest order accepted';
  exception when raise_exception then
    assert sqlerrm = 'too_many_orders', sqlerrm;
  end;
end $$;
commit;

-- ------------------------------------------- other customers and admin ----
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true) \g /dev/null
set local role authenticated;
do $$
declare
  v_order uuid := (select v::uuid from guest_fixture where k = 'order_id');
begin
  assert not exists (select 1 from public.orders where id = v_order), 'a signed-in customer cannot read a guest order';
  assert not exists (select 1 from public.orders where user_id is null), 'no guest orders visible to customers';
  assert public.get_guest_order(v_order, 'guest-token-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB') is null,
    'a customer with the wrong token reads nothing';
end $$;
commit;

-- A customer order: E.164 phone, zone recorded, zone fee falls back to default.
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true) \g /dev/null
set local role authenticated;
do $$
declare
  v_order record;
begin
  select * into v_order from public.place_cod_order(
    jsonb_build_array(jsonb_build_object('variant_id', (select id from public.product_variants where sku = 'SMP-DLN-CLN-150'), 'quantity', 1)),
    '{"customer_name":"Phone Only","phone":"01012345678","address_line1":"9 Tahrir Sq","city":"Downtown","zone":"C"}',
    gen_random_uuid());
  assert (select phone from public.orders where id = v_order.order_id) = '+201012345678', 'customer phone normalised';
  assert (select delivery_fee_cents from public.orders where id = v_order.order_id) = 5000, 'default fee when zone has none';
  assert (select guest_access_hash from public.orders where id = v_order.order_id) is null, 'customer orders carry no guest hash';
  assert (select count(*) from public.orders) = 1, 'customer sees only their own order';
end $$;
commit;

begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', true) \g /dev/null
set local role authenticated;
do $$ begin
  assert (select count(*) from public.orders where user_id is null) = 3, 'admin sees guest orders for fulfilment';
  assert (select count(*) from public.delivery_zones) = 27, 'admin sees inactive zones';
  update public.delivery_zones set is_active = true where code = 'WAD';
  assert (select is_active from public.delivery_zones where code = 'WAD'), 'admin manages zones';
end $$;
commit;

-- Constraint backstop: a guest order without a token hash cannot exist.
do $$ begin
  begin
    insert into public.orders (user_id, idempotency_key, currency, subtotal_cents, delivery_fee_cents, total_cents,
      customer_name, phone, address_line1, city)
    values (null, gen_random_uuid(), 'EGP', 0, 0, 0, 'Nobody', '+201000000000', 'Somewhere', 'Cairo');
    raise exception 'ownerless order inserted';
  exception when check_violation then null;
  end;
end $$;

update public.store_settings set delivery_fee_cents = 0;
\echo 'phone, zone and guest order tests passed'
