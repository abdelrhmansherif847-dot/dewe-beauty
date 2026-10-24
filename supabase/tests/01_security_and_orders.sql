-- Database tests for RLS and the cash-on-delivery order flow.
-- Run with scripts/test-db.sh. Each failing assertion aborts the run.
\set ON_ERROR_STOP 1
\set QUIET 1

-- Fixtures: two customers and one admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.test', '{"full_name":"Customer A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.test', '{}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.test', '{}');
insert into public.staff (user_id) values ('00000000-0000-0000-0000-0000000000ad');

-- A hidden product to prove inactive rows never leak.
insert into public.products (slug, brand_id, name, is_active)
select 'hidden-product', id, 'Hidden', false from public.brands where slug = 'dewlune';
insert into public.product_variants (product_id, sku, name, price_cents, stock)
select id, 'HIDDEN-1', 'Default', 1000, 5 from public.products where slug = 'hidden-product';

do $$ begin
  assert (select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Customer A',
    'profile is created from auth metadata';
end $$;

-- ---------------------------------------------------------------- anon ----
begin;
set local role anon;

do $$ begin
  assert (select count(*) from public.product_listing) = 12, 'anon sees the 12 active sample products';
  assert not exists (select 1 from public.products where slug = 'hidden-product'), 'inactive product hidden';
  assert not exists (select 1 from public.product_variants where sku = 'HIDDEN-1'), 'variant of inactive product hidden';
  assert (select count(*) from public.orders) = 0, 'anon reads no orders';
  assert (select count(*) from public.profiles) = 0, 'anon reads no profiles';
end $$;

do $$ begin
  begin
    insert into public.brands (slug, name) values ('rogue', 'Rogue');
    raise exception 'anon inserted a brand';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.product_variants set price_cents = 1;
    -- RLS makes the update affect zero rows rather than error.
    assert not exists (select 1 from public.product_variants where price_cents = 1), 'anon changed a price';
  end;
  begin
    perform public.place_cod_order('[]'::jsonb, '{}'::jsonb, gen_random_uuid());
    raise exception 'anon could call place_cod_order';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- ------------------------------------------------------- search -----------
begin;
set local role anon;
do $$ begin
  assert (select count(*) from public.search_products(p_brand => 'mochera')) = 3, 'brand filter';
  assert (select count(*) from public.search_products(p_category => 'lips')) = 2, 'category filter';
  assert (select count(*) from public.search_products(p_query => 'glow')) >= 3, 'text search matches names and tags';
  assert (select count(*) from public.search_products(p_query => '%')) = 0, 'LIKE wildcards are escaped';
  assert (select count(*) from public.search_products(p_in_stock => true)) = 11, 'in-stock filter drops the sold-out palette';
  assert (select min_price_cents from public.search_products(p_sort => 'price-asc') limit 1) = 22000, 'price ascending';
  assert (select min_price_cents from public.search_products(p_sort => 'price-desc') limit 1) = 120000, 'price descending';
  assert (select count(*) from public.search_products(p_limit => 1000)) = 12, 'limit is clamped but returns all';
end $$;
commit;

-- --------------------------------------------------- customer A order -----
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true) \g /dev/null
set local role authenticated;

do $$
declare
  v_serum uuid := (select id from public.product_variants where sku = 'SMP-DLN-SER-30');
  v_tint uuid := (select id from public.product_variants where sku = 'SMP-RSL-TNT-01');
  v_order record;
  v_key uuid := '11111111-1111-1111-1111-111111111111';
  v_again record;
begin
  -- Client tries to smuggle a price; it must be ignored.
  select * into v_order from public.place_cod_order(
    jsonb_build_array(
      jsonb_build_object('variant_id', v_serum, 'quantity', 2, 'price_cents', 1),
      jsonb_build_object('variant_id', v_tint, 'quantity', 1),
      jsonb_build_object('variant_id', v_tint, 'quantity', 1)
    ),
    '{"customer_name":"Customer A","phone":"+20 100 000 0000","address_line1":"1 Nile St","city":"Cairo"}',
    v_key
  );

  assert (select subtotal_cents from public.orders where id = v_order.order_id) = 2 * 64000 + 2 * 31000,
    'subtotal uses database prices and merges duplicate lines';
  assert (select total_cents from public.orders where id = v_order.order_id)
       = (select subtotal_cents + delivery_fee_cents from public.orders where id = v_order.order_id), 'total adds delivery';
  assert (select count(*) from public.order_items where order_id = v_order.order_id) = 2, 'two order lines';
  assert (select stock from public.product_variants where id = v_serum) = 22, 'serum stock decremented';
  assert (select stock from public.product_variants where id = v_tint) = 16, 'tint stock decremented';

  -- Retrying the same submission returns the same order without new stock moves.
  select * into v_again from public.place_cod_order(
    jsonb_build_array(jsonb_build_object('variant_id', v_serum, 'quantity', 2)),
    '{"customer_name":"Customer A","phone":"+20 100 000 0000","address_line1":"1 Nile St","city":"Cairo"}',
    v_key
  );
  assert v_again.order_id = v_order.order_id, 'idempotent retry returns the original order';
  assert (select stock from public.product_variants where id = v_serum) = 22, 'retry does not move stock';
end $$;

-- Failure cases leave stock untouched.
do $$
declare
  v_sold_out uuid := (select id from public.product_variants where sku = 'SMP-RSL-TNT-02');
  v_low uuid := (select id from public.product_variants where sku = 'SMP-RSL-EDP-50');
  v_ok uuid := (select id from public.product_variants where sku = 'SMP-DLN-CLN-150');
  v_ship jsonb := '{"customer_name":"Customer A","phone":"+20 100 000 0000","address_line1":"1 Nile St","city":"Cairo"}';
begin
  begin
    perform public.place_cod_order(
      jsonb_build_array(
        jsonb_build_object('variant_id', v_ok, 'quantity', 1),
        jsonb_build_object('variant_id', v_low, 'quantity', 3)
      ), v_ship, gen_random_uuid());
    raise exception 'oversold a variant';
  exception when raise_exception then
    assert sqlerrm like 'insufficient_stock:%', 'insufficient stock error, got ' || sqlerrm;
  end;
  assert (select stock from public.product_variants where id = v_ok) = 30, 'no partial stock change';

  begin
    perform public.place_cod_order(jsonb_build_array(jsonb_build_object('variant_id', v_sold_out, 'quantity', 1)), v_ship, gen_random_uuid());
    raise exception 'sold a sold-out variant';
  exception when raise_exception then
    assert sqlerrm like 'insufficient_stock:%', sqlerrm;
  end;

  begin
    perform public.place_cod_order(jsonb_build_array(jsonb_build_object('variant_id', v_ok, 'quantity', 11)), v_ship, gen_random_uuid());
    raise exception 'quantity cap not enforced';
  exception when raise_exception then
    assert sqlerrm = 'invalid_quantity', sqlerrm;
  end;

  begin
    perform public.place_cod_order(jsonb_build_array(jsonb_build_object('variant_id', v_ok, 'quantity', 0)), v_ship, gen_random_uuid());
    raise exception 'zero quantity accepted';
  exception when raise_exception then
    assert sqlerrm = 'invalid_quantity', sqlerrm;
  end;

  begin
    perform public.place_cod_order(jsonb_build_array(jsonb_build_object('variant_id', 'not-a-uuid', 'quantity', 1)), v_ship, gen_random_uuid());
    raise exception 'malformed line accepted';
  exception when raise_exception then
    assert sqlerrm like 'invalid_request:%', sqlerrm;
  end;

  begin
    perform public.place_cod_order(jsonb_build_array(jsonb_build_object('variant_id', gen_random_uuid(), 'quantity', 1)), v_ship, gen_random_uuid());
    raise exception 'unknown variant accepted';
  exception when raise_exception then
    assert sqlerrm = 'unavailable_item', sqlerrm;
  end;

  begin
    perform public.place_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', (select v.id from public.product_variants v where v.sku = 'SMP-DLN-CLN-150'), 'quantity', 1)),
      '{"customer_name":"A","phone":"call me","address_line1":"x","city":""}', gen_random_uuid());
    raise exception 'bad shipping accepted';
  exception when raise_exception then
    assert sqlerrm = 'invalid_shipping', sqlerrm;
  end;

  begin
    insert into public.orders (user_id, idempotency_key, currency, subtotal_cents, delivery_fee_cents, total_cents,
      customer_name, phone, address_line1, city)
    values (auth.uid(), gen_random_uuid(), 'EGP', 0, 0, 0, 'Cheat', '+20 100 000 0000', 'Somewhere', 'Cairo');
    raise exception 'customer inserted an order directly';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.staff (user_id) values (auth.uid());
    raise exception 'customer promoted themselves';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_set_order_status((select id from public.orders limit 1), 'cancelled');
    raise exception 'customer changed an order status';
  exception when raise_exception then
    assert sqlerrm = 'forbidden', sqlerrm;
  end;

  assert (select count(*) from public.orders) = 1, 'customer A sees exactly their own order';
end $$;
commit;

-- Inactive variant cannot be bought even when its id is known.
update public.product_variants set is_active = false where sku = 'SMP-PCL-HMS-100';
select id as inactive_variant_id from public.product_variants where sku = 'SMP-PCL-HMS-100' \gset
select set_config('test.inactive_variant', :'inactive_variant_id', false) \g /dev/null
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true) \g /dev/null
set local role authenticated;
do $$ begin
  begin
    perform public.place_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', current_setting('test.inactive_variant'), 'quantity', 1)),
      '{"customer_name":"Customer A","phone":"+20 100 000 0000","address_line1":"1 Nile St","city":"Cairo"}', gen_random_uuid());
    raise exception 'inactive variant sold';
  exception when raise_exception then
    assert sqlerrm = 'unavailable_item', sqlerrm;
  end;
end $$;
commit;
update public.product_variants set is_active = true where sku = 'SMP-PCL-HMS-100';

-- ------------------------------------------------------------ customer B --
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true) \g /dev/null
set local role authenticated;
do $$ begin
  assert (select count(*) from public.orders) = 0, 'customer B cannot read A''s orders';
  assert (select count(*) from public.order_items) = 0, 'customer B cannot read A''s order items';
  assert (select count(*) from public.profiles) = 1, 'customer B reads only their own profile';
  update public.profiles set full_name = 'Hijack' where id = '00000000-0000-0000-0000-00000000000a';
end $$;
commit;

do $$ begin
  assert (select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Customer A',
    'customer B cannot edit A''s profile';
end $$;

-- ----------------------------------------------------------------- admin --
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', true) \g /dev/null
set local role authenticated;
do $$
declare
  v_order uuid := (select id from public.orders limit 1);
begin
  assert private.is_admin(), 'admin recognised';
  assert exists (select 1 from public.products where slug = 'hidden-product'), 'admin sees inactive products';
  update public.product_variants set price_cents = 65000 where sku = 'SMP-DLN-SER-30';
  assert (select price_cents from public.product_variants where sku = 'SMP-DLN-SER-30') = 65000, 'admin can edit prices';
  assert (select unit_price_cents from public.order_items where sku = 'SMP-DLN-SER-30') = 64000, 'order keeps the price paid';

  perform public.admin_set_order_status(v_order, 'confirmed');
  perform public.admin_set_order_status(v_order, 'cancelled');
  assert (select stock from public.product_variants where sku = 'SMP-DLN-SER-30') = 24, 'cancel restocks serum';
  assert (select stock from public.product_variants where sku = 'SMP-RSL-TNT-01') = 18, 'cancel restocks tint';

  perform public.admin_set_order_status(v_order, 'cancelled');
  assert (select stock from public.product_variants where sku = 'SMP-DLN-SER-30') = 24, 'second cancel is a no-op';

  begin
    perform public.admin_set_order_status(v_order, 'shipped');
    raise exception 'reopened a cancelled order';
  exception when raise_exception then
    assert sqlerrm = 'order_closed', sqlerrm;
  end;
end $$;
commit;

\echo 'security and order tests passed'

do $$ begin
  assert to_regprocedure('public.is_admin()') is null, 'is_admin is not exposed in the public API schema';
end $$;
\echo 'schema exposure checks passed'

begin;
set local role anon;
do $$ begin
  assert (select default_variant_name from public.product_listing where slug = 'cloud-milk-cleanser') = '150 ml',
    'listing exposes default variant name';
  assert (select default_variant_name from public.search_products(p_query => 'cleanser') limit 1) = '150 ml',
    'search_products returns the new listing columns';
end $$;
commit;
\echo 'listing checks passed'
