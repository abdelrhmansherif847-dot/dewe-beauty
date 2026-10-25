-- Guest orders can only be created by the storefront server (service_role).
-- Runs after 02_phone_and_guest_orders.sql. Each failing assertion aborts the run.
\set ON_ERROR_STOP 1
\set QUIET 1

-- ------------------------------------------------------------- grants ----
do $$ begin
  assert not has_function_privilege('anon', 'public.place_guest_cod_order(jsonb,jsonb,uuid,text)', 'execute'),
    'anon must not execute place_guest_cod_order';
  assert not has_function_privilege('authenticated', 'public.place_guest_cod_order(jsonb,jsonb,uuid,text)', 'execute'),
    'authenticated must not execute place_guest_cod_order';
  assert has_function_privilege('service_role', 'public.place_guest_cod_order(jsonb,jsonb,uuid,text)', 'execute'),
    'service_role executes place_guest_cod_order';

  -- No other definer function lets the public API create orders: anon may only
  -- read a guest order by token, and signed-in users may only order for themselves.
  assert (
    select coalesce(array_agg(p.proname::text order by p.proname), '{}')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosecdef
      and has_function_privilege('anon', p.oid, 'execute')
  ) = array['get_guest_order', 'is_admin'], 'unexpected definer function open to anon';
  assert (
    select coalesce(array_agg(p.proname::text order by p.proname), '{}')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'execute')
  ) = array['admin_set_order_status', 'get_guest_order', 'is_admin', 'place_cod_order'],
    'unexpected definer function open to authenticated';

  -- And neither role can write orders directly.
  assert not has_table_privilege('anon', 'public.orders', 'insert'), 'anon inserts orders';
  assert not has_table_privilege('authenticated', 'public.orders', 'insert'), 'authenticated inserts orders';
  assert not has_table_privilege('anon', 'public.order_items', 'insert'), 'anon inserts order items';
  assert not has_table_privilege('authenticated', 'public.order_items', 'insert'), 'authenticated inserts order items';
end $$;

create temporary table grant_fixture as
select
  (select id from public.product_variants where sku = 'SMP-DLN-CLN-150') as variant_id,
  '{"customer_name":"Grant Check","phone":"01222223333","address_line1":"9 Tahrir St","city":"Downtown","zone":"C"}'::jsonb as ship,
  'guest-token-grants-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'::text as token;
grant select on grant_fixture to anon, authenticated, service_role;

-- ------------------------------------------------- direct API callers ----
begin;
set local role anon;
do $$
declare f grant_fixture;
begin
  select * into f from grant_fixture;
  perform public.place_guest_cod_order(
    jsonb_build_array(jsonb_build_object('variant_id', f.variant_id, 'quantity', 1)), f.ship, gen_random_uuid(), f.token);
  raise exception 'anon placed a guest order directly';
exception when insufficient_privilege then null;
end $$;
commit;

begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true) \g /dev/null
set local role authenticated;
do $$
declare f grant_fixture;
begin
  select * into f from grant_fixture;
  perform public.place_guest_cod_order(
    jsonb_build_array(jsonb_build_object('variant_id', f.variant_id, 'quantity', 1)), f.ship, gen_random_uuid(), f.token);
  raise exception 'a signed-in user placed a guest order directly';
exception when insufficient_privilege then null;
end $$;
commit;

-- ------------------------------------------------- server (service_role) --
create temporary table grant_state as
select (select cod_enabled from public.store_settings) as cod_enabled,
       (select count(*) from public.orders) as orders,
       (select stock from public.product_variants where sku = 'SMP-DLN-CLN-150') as stock;

-- With ordering switched off the server path writes nothing.
update public.store_settings set cod_enabled = false;
begin;
set local role service_role;
do $$
declare f grant_fixture;
begin
  select * into f from grant_fixture;
  begin
    perform public.place_guest_cod_order(
      jsonb_build_array(jsonb_build_object('variant_id', f.variant_id, 'quantity', 1)), f.ship, gen_random_uuid(), f.token);
    raise exception 'guest order accepted while ordering is off';
  exception when raise_exception then
    assert sqlerrm = 'checkout_unavailable', sqlerrm;
  end;
end $$;
commit;
do $$ begin
  assert (select count(*) from public.orders) = (select orders from grant_state), 'no order while ordering is off';
  assert (select stock from public.product_variants where sku = 'SMP-DLN-CLN-150') = (select stock from grant_state),
    'no stock change while ordering is off';
end $$;

-- With ordering on, the server path places the order and takes stock.
update public.store_settings set cod_enabled = true;
begin;
set local role service_role;
do $$
declare
  f grant_fixture;
  v_order record;
begin
  select * into f from grant_fixture;
  select * into v_order from public.place_guest_cod_order(
    jsonb_build_array(jsonb_build_object('variant_id', f.variant_id, 'quantity', 1)), f.ship, gen_random_uuid(), f.token);
  assert v_order.order_id is not null, 'service_role placed a guest order';
  assert (select user_id from public.orders where id = v_order.order_id) is null, 'order has no user';
  assert (select guest_access_hash from public.orders where id = v_order.order_id)
    = sha256(convert_to(f.token, 'UTF8')), 'order is tied to the buyer token';
end $$;
commit;
do $$ begin
  assert (select stock from public.product_variants where sku = 'SMP-DLN-CLN-150') = (select stock from grant_state) - 1,
    'server path takes stock';
end $$;

update public.store_settings set cod_enabled = (select cod_enabled from grant_state);

\echo 'guest order grant tests passed'
