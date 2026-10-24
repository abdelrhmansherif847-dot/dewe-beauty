-- DEWÉ BEAUTY: catalog, customers and cash-on-delivery orders.
--
-- Security model
--   * Catalog tables are readable by everyone, but only rows that are active.
--   * Writes to the catalog are limited to staff (public.staff), checked by
--     public.is_admin(). Staff rows can only be created with the service role.
--   * Customers can read their own profile and orders. They can never insert
--     orders directly: public.place_cod_order() is the only path, and it
--     recomputes every price and checks stock while holding row locks.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff and admin check
-- ---------------------------------------------------------------------------

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table public.staff enable row level security;

create policy "staff can read own row"
  on public.staff for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff s where s.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Customer profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create policy "customers read own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "customers update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80),
  tagline text check (char_length(tagline) <= 160),
  description text,
  logo_url text,
  is_sample boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 160),
  short_description text check (char_length(short_description) <= 280),
  description text,
  how_to_use text,
  ingredients text,
  tags text[] not null default '{}',
  is_sample boolean not null default false,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_brand_id_idx on public.products (brand_id);
create index products_category_id_idx on public.products (category_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique check (char_length(sku) between 1 and 64),
  name text not null check (char_length(name) between 1 and 80),
  swatch_hex text check (swatch_hex ~ '^#[0-9A-Fa-f]{6}$'),
  -- Money is stored in the smallest currency unit (piastres for EGP).
  price_cents integer not null check (price_cents >= 0),
  compare_at_cents integer check (compare_at_cents is null or compare_at_cents > price_cents),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_variants_product_id_idx on public.product_variants (product_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  is_placeholder boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images (product_id);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_products (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (collection_id, product_id)
);

create index collection_products_product_id_idx on public.collection_products (product_id);

create trigger brands_updated_at before update on public.brands
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger collections_updated_at before update on public.collections
  for each row execute function public.set_updated_at();

alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.collections enable row level security;
alter table public.collection_products enable row level security;

-- Public read of active rows. A product is visible only while its brand is.
create policy "public reads active brands" on public.brands
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "public reads active categories" on public.categories
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "public reads active products" on public.products
  for select to anon, authenticated
  using (
    (
      is_active
      and exists (select 1 from public.brands b where b.id = brand_id and b.is_active)
    )
    or (select public.is_admin())
  );

create policy "public reads active variants" on public.product_variants
  for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.products p where p.id = product_id))
    or (select public.is_admin())
  );

create policy "public reads product images" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));

create policy "public reads active collections" on public.collections
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "public reads collection products" on public.collection_products
  for select to anon, authenticated
  using (exists (select 1 from public.collections c where c.id = collection_id));

-- Staff manage the catalog.
create policy "admins insert brands" on public.brands for insert to authenticated
  with check ((select public.is_admin()));
create policy "admins update brands" on public.brands for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete brands" on public.brands for delete to authenticated
  using ((select public.is_admin()));

create policy "admins insert categories" on public.categories for insert to authenticated
  with check ((select public.is_admin()));
create policy "admins update categories" on public.categories for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete categories" on public.categories for delete to authenticated
  using ((select public.is_admin()));

create policy "admins insert products" on public.products for insert to authenticated
  with check ((select public.is_admin()));
create policy "admins update products" on public.products for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete products" on public.products for delete to authenticated
  using ((select public.is_admin()));

create policy "admins insert variants" on public.product_variants for insert to authenticated
  with check ((select public.is_admin()));
create policy "admins update variants" on public.product_variants for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete variants" on public.product_variants for delete to authenticated
  using ((select public.is_admin()));

create policy "admins insert images" on public.product_images for insert to authenticated
  with check ((select public.is_admin()));
create policy "admins update images" on public.product_images for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete images" on public.product_images for delete to authenticated
  using ((select public.is_admin()));

create policy "admins insert collections" on public.collections for insert to authenticated
  with check ((select public.is_admin()));
create policy "admins update collections" on public.collections for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete collections" on public.collections for delete to authenticated
  using ((select public.is_admin()));

create policy "admins insert collection products" on public.collection_products for insert to authenticated
  with check ((select public.is_admin()));
create policy "admins update collection products" on public.collection_products for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete collection products" on public.collection_products for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Store settings (single row)
-- ---------------------------------------------------------------------------

create table public.store_settings (
  id boolean primary key default true check (id),
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  free_delivery_threshold_cents integer check (free_delivery_threshold_cents is null or free_delivery_threshold_cents >= 0),
  cod_enabled boolean not null default true,
  max_quantity_per_item integer not null default 10 check (max_quantity_per_item between 1 and 100),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (true);

create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

create policy "public reads store settings" on public.store_settings
  for select to anon, authenticated using (true);
create policy "admins update store settings" on public.store_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create type public.order_status as enum (
  'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 10001) unique,
  user_id uuid not null references auth.users (id) on delete restrict,
  idempotency_key uuid not null,
  status public.order_status not null default 'pending',
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  currency text not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents = subtotal_cents + delivery_fee_cents),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  phone text not null check (phone ~ '^\+?[0-9 ]{7,20}$'),
  address_line1 text not null check (char_length(address_line1) between 3 and 200),
  address_line2 text check (char_length(address_line2) <= 200),
  city text not null check (char_length(city) between 2 and 80),
  region text check (char_length(region) <= 80),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index orders_user_id_created_at_idx on public.orders (user_id, created_at desc);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  brand_name text not null,
  variant_name text not null,
  sku text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents = unit_price_cents * quantity)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_variant_id_idx on public.order_items (variant_id);
create index order_items_product_id_idx on public.order_items (product_id);

-- Belt and braces: even without policies, customers get no write grants.
revoke insert, update, delete, truncate on public.orders from anon, authenticated;
revoke insert, update, delete, truncate on public.order_items from anon, authenticated;
revoke insert, update, delete, truncate on public.staff from anon, authenticated;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- No insert/update/delete policies for customers: orders are created only by
-- place_cod_order() and changed only by admin_set_order_status().
create policy "customers read own orders" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "customers read own order items" on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = (select auth.uid()) or (select public.is_admin()))
    )
  );

-- ---------------------------------------------------------------------------
-- place_cod_order: the only way to create an order.
--
-- p_items:    [{"variant_id": uuid, "quantity": int}, ...]
-- p_shipping: {"customer_name", "phone", "address_line1", "address_line2",
--              "city", "region", "notes"}
--
-- Prices come from the database, never from the client. Variant rows are
-- locked (in a stable order, to avoid deadlocks) before stock is checked and
-- decremented, so two customers cannot both buy the last unit.
-- Errors are raised with SQLSTATE P0001 and a stable message prefix that the
-- app maps to customer-facing copy.
-- ---------------------------------------------------------------------------

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
  v_settings public.store_settings%rowtype;
  v_order public.orders%rowtype;
  v_item record;
  v_subtotal bigint := 0;
  v_delivery integer;
  v_requested integer;
  v_locked integer;
  v_phone text;
  v_variant_ids uuid[];
  v_quantities integer[];
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  if p_idempotency_key is null then
    raise exception 'invalid_request: idempotency key missing' using errcode = 'P0001';
  end if;

  -- A retried submission returns the order it already created.
  select * into v_order
  from public.orders o
  where o.user_id = v_user_id and o.idempotency_key = p_idempotency_key;
  if found then
    return query select v_order.id, v_order.order_number;
    return;
  end if;

  select * into v_settings from public.store_settings where id;
  if not found or not v_settings.cod_enabled then
    raise exception 'checkout_unavailable' using errcode = 'P0001';
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
    else v_settings.delivery_fee_cents
  end;

  v_phone := regexp_replace(coalesce(p_shipping ->> 'phone', ''), '[^0-9+ ]', '', 'g');

  begin
    insert into public.orders (
      user_id, idempotency_key, currency, subtotal_cents, delivery_fee_cents, total_cents,
      customer_name, phone, address_line1, address_line2, city, region, notes
    ) values (
      v_user_id,
      p_idempotency_key,
      v_settings.currency,
      v_subtotal,
      v_delivery,
      v_subtotal + v_delivery,
      trim(coalesce(p_shipping ->> 'customer_name', '')),
      trim(v_phone),
      trim(coalesce(p_shipping ->> 'address_line1', '')),
      nullif(trim(coalesce(p_shipping ->> 'address_line2', '')), ''),
      trim(coalesce(p_shipping ->> 'city', '')),
      nullif(trim(coalesce(p_shipping ->> 'region', '')), ''),
      nullif(trim(coalesce(p_shipping ->> 'notes', '')), '')
    )
    returning * into v_order;
  exception
    when check_violation then
      raise exception 'invalid_shipping' using errcode = 'P0001';
    when unique_violation then
      -- A concurrent retry with the same key won the race.
      select * into v_order from public.orders o
      where o.user_id = v_user_id and o.idempotency_key = p_idempotency_key;
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

revoke all on function public.place_cod_order(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.place_cod_order(jsonb, jsonb, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_set_order_status: staff move orders through fulfilment. Cancelling an
-- order that has not been delivered returns its units to stock exactly once.
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.order_status;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select o.status into v_current from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  if v_current = p_status then
    return v_current;
  end if;

  if v_current in ('cancelled', 'delivered') then
    raise exception 'order_closed' using errcode = 'P0001';
  end if;

  if p_status = 'cancelled' then
    update public.product_variants v
    set stock = v.stock + i.quantity
    from public.order_items i
    where i.order_id = p_order_id and i.variant_id = v.id;
  end if;

  update public.orders set status = p_status where id = p_order_id;
  return p_status;
end;
$$;

revoke all on function public.admin_set_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.admin_set_order_status(uuid, public.order_status) to authenticated;

-- ---------------------------------------------------------------------------
-- Storefront listing: one row per visible product with price range, stock
-- and lead image. security_invoker keeps RLS of the caller in force.
-- ---------------------------------------------------------------------------

create view public.product_listing
with (security_invoker = true)
as
select
  p.id,
  p.slug,
  p.name,
  p.short_description,
  p.tags,
  p.is_sample,
  p.is_featured,
  p.created_at,
  b.slug as brand_slug,
  b.name as brand_name,
  c.slug as category_slug,
  c.name as category_name,
  agg.min_price_cents,
  agg.max_price_cents,
  agg.compare_at_cents,
  agg.total_stock,
  agg.variant_count,
  agg.default_variant_id,
  img.url as image_url,
  img.alt as image_alt,
  coalesce(img.is_placeholder, true) as image_is_placeholder
from public.products p
join public.brands b on b.id = p.brand_id
left join public.categories c on c.id = p.category_id
join lateral (
  select
    min(v.price_cents) as min_price_cents,
    max(v.price_cents) as max_price_cents,
    max(v.compare_at_cents) as compare_at_cents,
    sum(v.stock)::integer as total_stock,
    count(*)::integer as variant_count,
    (array_agg(v.id order by (v.stock > 0) desc, v.sort_order, v.price_cents))[1] as default_variant_id
  from public.product_variants v
  where v.product_id = p.id and v.is_active
) agg on agg.variant_count > 0
left join lateral (
  select i.url, i.alt, i.is_placeholder
  from public.product_images i
  where i.product_id = p.id
  order by i.sort_order
  limit 1
) img on true;

grant select on public.product_listing to anon, authenticated;

create or replace function public.escape_like(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(p_value, '\', '\\'), '%', '\%'), '_', '\_');
$$;

-- Search, filter and sort for the shop page. Runs as the caller (RLS applies).
create or replace function public.search_products(
  p_query text default null,
  p_brand text default null,
  p_category text default null,
  p_in_stock boolean default false,
  p_sort text default 'featured',
  p_limit integer default 24,
  p_offset integer default 0
)
returns setof public.product_listing
language sql
stable
security invoker
set search_path = ''
as $$
  select l.*
  from public.product_listing l
  where (p_brand is null or l.brand_slug = p_brand)
    and (p_category is null or l.category_slug = p_category)
    and (not coalesce(p_in_stock, false) or l.total_stock > 0)
    and (
      p_query is null or btrim(p_query) = ''
      or l.name ilike '%' || public.escape_like(btrim(p_query)) || '%' escape '\'
      or l.brand_name ilike '%' || public.escape_like(btrim(p_query)) || '%' escape '\'
      or coalesce(l.short_description, '') ilike '%' || public.escape_like(btrim(p_query)) || '%' escape '\'
      or exists (
        select 1 from unnest(l.tags) t
        where t ilike '%' || public.escape_like(btrim(p_query)) || '%' escape '\'
      )
    )
  order by
    case when p_sort = 'price-asc' then l.min_price_cents end asc nulls last,
    case when p_sort = 'price-desc' then l.min_price_cents end desc nulls last,
    case when p_sort = 'newest' then l.created_at end desc nulls last,
    case when p_sort = 'name' then l.name end asc nulls last,
    l.is_featured desc,
    (l.total_stock > 0) desc,
    l.name asc
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.escape_like(text) to anon, authenticated;
grant execute on function public.search_products(text, text, text, boolean, text, integer, integer) to anon, authenticated;
