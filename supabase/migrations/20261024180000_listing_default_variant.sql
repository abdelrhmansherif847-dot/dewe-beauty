-- Expose the default variant's name and swatch on product_listing so product
-- cards can add single-variant products to the bag with a correct label.
create or replace view public.product_listing
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
  coalesce(img.is_placeholder, true) as image_is_placeholder,
  dv.name as default_variant_name,
  dv.swatch_hex as default_variant_swatch
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
left join public.product_variants dv on dv.id = agg.default_variant_id
left join lateral (
  select i.url, i.alt, i.is_placeholder
  from public.product_images i
  where i.product_id = p.id
  order by i.sort_order
  limit 1
) img on true;
