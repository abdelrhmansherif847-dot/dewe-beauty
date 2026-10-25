-- Phone-first accounts, delivery zones and guest checkout.
--
-- * Contact numbers are Egyptian mobile numbers, stored as E.164
--   (+201XXXXXXXXX). private.normalize_eg_mobile() is the single rule; the app
--   mirrors it in src/lib/phone.ts for instant feedback only.
-- * Customers may give an optional contact email. It is stored on the profile
--   and the order, is never used to sign in, and nothing is sent to it yet.
-- * Delivery is limited to active rows of public.delivery_zones (Egyptian
--   governorates). Each zone may override the store's default delivery fee.
-- * Guest orders have no user. Each one carries the SHA-256 hash of a random
--   access token that only the buyer's browser holds. Guest orders can only
--   be read through get_guest_order() with that token: knowing an order id or
--   number is never enough.
-- * place_cod_order() keeps its signature. Its body moves to
--   private.create_cod_order(), shared with place_guest_cod_order().

-- ---------------------------------------------------------------------------
-- Phone numbers
-- ---------------------------------------------------------------------------

-- Accepts 01XXXXXXXXX, 201XXXXXXXXX, +201XXXXXXXXX or 00201XXXXXXXXX with any
-- spaces, dashes, dots or brackets. Returns +201XXXXXXXXX, or null when the
-- value is not an Egyptian mobile number (prefixes 010, 011, 012, 015).
create or replace function private.normalize_eg_mobile(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d ~ '^(0020|\+20|20)?0?1[0125][0-9]{8}$'
      then '+20' || right(d, 10)
    else null
  end
  from (select regexp_replace(coalesce(p_value, ''), '[\s().-]', '', 'g') as d) s;
$$;

revoke all on function private.normalize_eg_mobile(text) from public;
grant execute on function private.normalize_eg_mobile(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Profiles: optional contact email, phone from the auth account
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column email text
    check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

-- auth.users.phone is stored without the leading +. contact_email is the
-- optional address typed at sign-up; it is not the account's login email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(nullif(trim(new.raw_user_meta_data ->> 'contact_email'), ''));
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120),
    private.normalize_eg_mobile(new.phone),
    case when v_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(v_email) <= 254 then v_email end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Delivery zones
-- ---------------------------------------------------------------------------

create table public.delivery_zones (
  code text primary key check (code ~ '^[A-Z]{1,4}$'),
  name text not null check (char_length(name) between 2 and 80),
  name_ar text not null check (char_length(name_ar) between 2 and 80),
  -- null means "use store_settings.delivery_fee_cents".
  delivery_fee_cents integer check (delivery_fee_cents is null or delivery_fee_cents >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger delivery_zones_updated_at before update on public.delivery_zones
  for each row execute function public.set_updated_at();

alter table public.delivery_zones enable row level security;

create policy "public reads active delivery zones" on public.delivery_zones
  for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy "admins insert delivery zones" on public.delivery_zones for insert to authenticated
  with check ((select private.is_admin()));
create policy "admins update delivery zones" on public.delivery_zones for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete delivery zones" on public.delivery_zones for delete to authenticated
  using ((select private.is_admin()));

-- The 27 governorates (ISO 3166-2:EG codes). All start active with the store's
-- default fee, which keeps today's behaviour; staff switch off the zones the
-- courier does not serve and set per-zone fees before launch.
insert into public.delivery_zones (code, name, name_ar, sort_order) values
  ('C', 'Cairo', 'القاهرة', 1),
  ('GZ', 'Giza', 'الجيزة', 2),
  ('ALX', 'Alexandria', 'الإسكندرية', 3),
  ('KB', 'Qalyubia', 'القليوبية', 4),
  ('DK', 'Dakahlia', 'الدقهلية', 5),
  ('SHR', 'Sharqia', 'الشرقية', 6),
  ('GH', 'Gharbia', 'الغربية', 7),
  ('MNF', 'Monufia', 'المنوفية', 8),
  ('BH', 'Beheira', 'البحيرة', 9),
  ('KFS', 'Kafr El Sheikh', 'كفر الشيخ', 10),
  ('DT', 'Damietta', 'دمياط', 11),
  ('PTS', 'Port Said', 'بورسعيد', 12),
  ('IS', 'Ismailia', 'الإسماعيلية', 13),
  ('SUZ', 'Suez', 'السويس', 14),
  ('FYM', 'Faiyum', 'الفيوم', 15),
  ('BNS', 'Beni Suef', 'بني سويف', 16),
  ('MN', 'Minya', 'المنيا', 17),
  ('AST', 'Asyut', 'أسيوط', 18),
  ('SHG', 'Sohag', 'سوهاج', 19),
  ('KN', 'Qena', 'قنا', 20),
  ('LX', 'Luxor', 'الأقصر', 21),
  ('ASN', 'Aswan', 'أسوان', 22),
  ('BA', 'Red Sea', 'البحر الأحمر', 23),
  ('WAD', 'New Valley', 'الوادي الجديد', 24),
  ('MT', 'Matrouh', 'مطروح', 25),
  ('SIN', 'North Sinai', 'شمال سيناء', 26),
  ('JS', 'South Sinai', 'جنوب سيناء', 27)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Orders: guests, zones, contact email, strict phone format
-- ---------------------------------------------------------------------------

alter table public.orders
  alter column user_id drop not null,
  add column guest_access_hash bytea,
  add column email text
    check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  add column delivery_zone_code text references public.delivery_zones (code) on update cascade on delete restrict,
  -- Exactly one owner: a signed-in customer, or a guest holding the token.
  add constraint orders_owner_check check ((user_id is null) = (guest_access_hash is not null)),
  add constraint orders_guest_hash_length check (guest_access_hash is null or octet_length(guest_access_hash) = 32);

alter table public.orders drop constraint orders_phone_check;
alter table public.orders add constraint orders_phone_check check (phone ~ '^\+201[0125][0-9]{8}$');

-- (user_id, idempotency_key) stays unique for customers; guests get their own.
create unique index orders_guest_idempotency_key on public.orders (idempotency_key) where user_id is null;
create index orders_guest_phone_created_at_idx on public.orders (phone, created_at desc) where user_id is null;
create index orders_delivery_zone_code_idx on public.orders (delivery_zone_code);

-- RLS is unchanged: "customers read own orders" matches user_id = auth.uid(),
-- which is never true for a guest order (null user), and anon has no policy.

-- ---------------------------------------------------------------------------
-- private.create_cod_order: shared by the customer and guest entry points.
-- Not callable through the API; only the security definer wrappers use it.
-- ---------------------------------------------------------------------------

create or replace function private.create_cod_order(
  p_user_id uuid,
  p_guest_hash bytea,
  p_items jsonb,
  p_shipping jsonb,
  p_idempotency_key uuid
)
returns table (order_id uuid, order_number bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.store_settings%rowtype;
  v_zone public.delivery_zones%rowtype;
  v_order public.orders%rowtype;
  v_item record;
  v_subtotal bigint := 0;
  v_delivery integer;
  v_requested integer;
  v_locked integer;
  v_phone text;
  v_email text;
  v_variant_ids uuid[];
  v_quantities integer[];
begin
  if (p_user_id is null) = (p_guest_hash is null) then
    raise exception 'invalid_request: order needs exactly one owner' using errcode = 'P0001';
  end if;

  if p_idempotency_key is null then
    raise exception 'invalid_request: idempotency key missing' using errcode = 'P0001';
  end if;

  -- A retried submission returns the order it already created. A guest key
  -- only matches when the same access token comes with it.
  if p_user_id is not null then
    select * into v_order from public.orders o
    where o.user_id = p_user_id and o.idempotency_key = p_idempotency_key;
  else
    select * into v_order from public.orders o
    where o.user_id is null and o.idempotency_key = p_idempotency_key;
    if found and v_order.guest_access_hash <> p_guest_hash then
      raise exception 'invalid_request: idempotency key already used' using errcode = 'P0001';
    end if;
  end if;
  if found then
    return query select v_order.id, v_order.order_number;
    return;
  end if;

  select * into v_settings from public.store_settings where id;
  if not found or not v_settings.cod_enabled then
    raise exception 'checkout_unavailable' using errcode = 'P0001';
  end if;

  v_phone := private.normalize_eg_mobile(p_shipping ->> 'phone');
  if v_phone is null then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;

  select * into v_zone from public.delivery_zones z
  where z.code = upper(trim(coalesce(p_shipping ->> 'zone', ''))) and z.is_active;
  if not found then
    raise exception 'unsupported_location' using errcode = 'P0001';
  end if;

  v_email := lower(nullif(trim(coalesce(p_shipping ->> 'email', '')), ''));

  -- Guests cannot hold more than three open orders per number in a day, so a
  -- script cannot tie up stock with fake cash-on-delivery orders.
  if p_user_id is null and (
    select count(*) from public.orders o
    where o.user_id is null and o.phone = v_phone and o.status = 'pending'
      and o.created_at > now() - interval '24 hours'
  ) >= 3 then
    raise exception 'too_many_orders' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_request: cart must contain 1 to 50 lines' using errcode = 'P0001';
  end if;

  -- Normalise the cart: validate shape and merge duplicate variants.
  begin
    select array_agg(x.variant_id order by x.variant_id), array_agg(x.quantity order by x.variant_id)
    into v_variant_ids, v_quantities
    from (
      select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) e
      group by 1
    ) x;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'invalid_request: malformed cart line' using errcode = 'P0001';
  end;

  if array_position(v_variant_ids, null) is not null or array_position(v_quantities, null) is not null then
    raise exception 'invalid_request: malformed cart line' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from unnest(v_quantities) q
    where q < 1 or q > v_settings.max_quantity_per_item
  ) then
    raise exception 'invalid_quantity' using errcode = 'P0001';
  end if;

  v_requested := cardinality(v_variant_ids);

  -- Lock every requested variant that is still purchasable.
  with locked as (
    select v.id
    from public.product_variants v
    join public.products p on p.id = v.product_id
    join public.brands b on b.id = p.brand_id
    where v.id = any (v_variant_ids)
      and v.is_active and p.is_active and b.is_active
    order by v.id
    for update of v
  )
  select count(*) into v_locked from locked;

  if v_locked <> v_requested then
    raise exception 'unavailable_item' using errcode = 'P0001';
  end if;

  for v_item in
    select l.variant_id, l.quantity, v.stock
    from unnest(v_variant_ids, v_quantities) as l (variant_id, quantity)
    join public.product_variants v on v.id = l.variant_id
    order by l.variant_id
  loop
    if v_item.stock < v_item.quantity then
      raise exception 'insufficient_stock:%', v_item.variant_id using errcode = 'P0001';
    end if;
  end loop;

  select sum(v.price_cents::bigint * l.quantity) into v_subtotal
  from unnest(v_variant_ids, v_quantities) as l (variant_id, quantity)
  join public.product_variants v on v.id = l.variant_id;

  if v_subtotal > 2000000000 then
    raise exception 'invalid_request: order total too large' using errcode = 'P0001';
  end if;

  v_delivery := case
    when v_settings.free_delivery_threshold_cents is not null
         and v_subtotal >= v_settings.free_delivery_threshold_cents then 0
    else coalesce(v_zone.delivery_fee_cents, v_settings.delivery_fee_cents)
  end;

  begin
    insert into public.orders (
      user_id, guest_access_hash, idempotency_key, currency, subtotal_cents, delivery_fee_cents, total_cents,
      customer_name, phone, email, address_line1, address_line2, city, region, delivery_zone_code, notes
    ) values (
      p_user_id,
      p_guest_hash,
      p_idempotency_key,
      v_settings.currency,
      v_subtotal,
      v_delivery,
      v_subtotal + v_delivery,
      trim(coalesce(p_shipping ->> 'customer_name', '')),
      v_phone,
      v_email,
      trim(coalesce(p_shipping ->> 'address_line1', '')),
      nullif(trim(coalesce(p_shipping ->> 'address_line2', '')), ''),
      trim(coalesce(p_shipping ->> 'city', '')),
      v_zone.name,
      v_zone.code,
      nullif(trim(coalesce(p_shipping ->> 'notes', '')), '')
    )
    returning * into v_order;
  exception
    when check_violation then
      raise exception 'invalid_shipping' using errcode = 'P0001';
    when unique_violation then
      -- A concurrent retry with the same key won the race.
      if p_user_id is not null then
        select * into v_order from public.orders o
        where o.user_id = p_user_id and o.idempotency_key = p_idempotency_key;
      else
        select * into v_order from public.orders o
        where o.user_id is null and o.idempotency_key = p_idempotency_key
          and o.guest_access_hash = p_guest_hash;
        if not found then
          raise exception 'invalid_request: idempotency key already used' using errcode = 'P0001';
        end if;
      end if;
      return query select v_order.id, v_order.order_number;
      return;
  end;

  insert into public.order_items (
    order_id, variant_id, product_id, product_name, brand_name, variant_name, sku,
    unit_price_cents, quantity, line_total_cents
  )
  select
    v_order.id, v.id, p.id, p.name, b.name, v.name, v.sku,
    v.price_cents, l.quantity, v.price_cents * l.quantity
  from unnest(v_variant_ids, v_quantities) as l (variant_id, quantity)
  join public.product_variants v on v.id = l.variant_id
  join public.products p on p.id = v.product_id
  join public.brands b on b.id = p.brand_id;

  update public.product_variants v
  set stock = v.stock - l.quantity
  from unnest(v_variant_ids, v_quantities) as l (variant_id, quantity)
  where v.id = l.variant_id;

  return query select v_order.id, v_order.order_number;
end;
$$;

revoke all on function private.create_cod_order(uuid, bytea, jsonb, jsonb, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Entry points
-- ---------------------------------------------------------------------------

-- Signed-in customers. Same signature and grants as before.
create or replace function public.place_cod_order(
  p_items jsonb,
  p_shipping jsonb,
  p_idempotency_key uuid
)
returns table (order_id uuid, order_number bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;
  return query select * from private.create_cod_order(v_user_id, null, p_items, p_shipping, p_idempotency_key);
end;
$$;

revoke all on function public.place_cod_order(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.place_cod_order(jsonb, jsonb, uuid) to authenticated;

-- Guests. p_access_token is a random secret (at least 32 bytes, base64url)
-- generated in the buyer's browser; only its SHA-256 hash is stored.
create or replace function public.place_guest_cod_order(
  p_items jsonb,
  p_shipping jsonb,
  p_idempotency_key uuid,
  p_access_token text
)
returns table (order_id uuid, order_number bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_access_token is null or p_access_token !~ '^[A-Za-z0-9_-]{43,128}$' then
    raise exception 'invalid_request: access token missing' using errcode = 'P0001';
  end if;
  return query select * from private.create_cod_order(
    null, sha256(convert_to(p_access_token, 'UTF8')), p_items, p_shipping, p_idempotency_key
  );
end;
$$;

revoke all on function public.place_guest_cod_order(jsonb, jsonb, uuid, text) from public;
grant execute on function public.place_guest_cod_order(jsonb, jsonb, uuid, text) to anon, authenticated;

-- Reads one guest order. Returns null unless both the id and the token match,
-- so a wrong token and a missing order look the same.
create or replace function public.get_guest_order(p_order_id uuid, p_access_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'currency', o.currency,
    'subtotal_cents', o.subtotal_cents,
    'delivery_fee_cents', o.delivery_fee_cents,
    'total_cents', o.total_cents,
    'customer_name', o.customer_name,
    'phone', o.phone,
    'email', o.email,
    'address_line1', o.address_line1,
    'address_line2', o.address_line2,
    'city', o.city,
    'region', o.region,
    'notes', o.notes,
    'created_at', o.created_at,
    'order_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'product_name', i.product_name,
        'brand_name', i.brand_name,
        'variant_name', i.variant_name,
        'unit_price_cents', i.unit_price_cents,
        'quantity', i.quantity,
        'line_total_cents', i.line_total_cents
      ) order by i.product_name)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id
    and o.user_id is null
    and p_access_token ~ '^[A-Za-z0-9_-]{43,128}$'
    and o.guest_access_hash = sha256(convert_to(p_access_token, 'UTF8'));
$$;

revoke all on function public.get_guest_order(uuid, text) from public;
grant execute on function public.get_guest_order(uuid, text) to anon, authenticated;
