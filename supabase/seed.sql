-- SAMPLE CATALOG for development and design review.
-- Every brand and product here is fictional and flagged is_sample = true so
-- the storefront labels it. Prices and stock are illustrative only.
-- Remove before launch with:
--   delete from public.products where is_sample;
--   delete from public.brands where is_sample;

insert into public.categories (slug, name, description, sort_order) values
  ('skincare', 'Skincare', 'Serums, moisturisers and cleansers for a dewy base.', 1),
  ('makeup', 'Makeup', 'Complexion, cheeks and eyes with a soft-focus finish.', 2),
  ('lips', 'Lips', 'Tints, balms and glosses in rosy, everyday shades.', 3),
  ('fragrance', 'Fragrance', 'Soft florals and warm skin scents.', 4),
  ('body', 'Body & Hair', 'Rituals from shoulders to ends.', 5)
on conflict (slug) do nothing;

insert into public.brands (slug, name, tagline, description, is_sample, sort_order) values
  ('dewlune', 'Dewlune', 'Moonlit hydration', 'Sample brand used to preview the storefront. Water-light skincare built around hydration.', true, 1),
  ('rosel-atelier', 'Rosel Atelier', 'Rose-toned colour', 'Sample brand used to preview the storefront. Buildable colour in rose and mauve families.', true, 2),
  ('mochera', 'Mochéra', 'Warm neutrals', 'Sample brand used to preview the storefront. Complexion and eye shades in warm mocha tones.', true, 3),
  ('peachline-lab', 'Peachline Lab', 'Gentle body care', 'Sample brand used to preview the storefront. Body and hair rituals with a peach-soft finish.', true, 4)
on conflict (slug) do nothing;

insert into public.collections (slug, name, description, sort_order) values
  ('everyday-glow-edit', 'The Everyday Glow Edit', 'Five steps to skin that looks rested and lit from within.', 1),
  ('soft-rose-lips', 'Soft Rose Lips', 'Rosy tints and balms, from sheer wash to satin colour.', 2)
on conflict (slug) do nothing;

with p(slug, brand, category, name, short_description, description, how_to_use, tags, featured) as (
  values
    ('dew-drop-hydrating-serum', 'dewlune', 'skincare', 'Dew Drop Hydrating Serum',
      'A water-light serum for a fresh, bouncy finish.',
      'Sample product. A lightweight gel serum designed to layer under moisturiser and makeup without pilling.',
      'Press two to three drops into clean skin morning and evening.',
      array['serum', 'hydration', 'glow'], true),
    ('cloud-milk-cleanser', 'dewlune', 'skincare', 'Cloud Milk Cleanser',
      'A soft milk cleanser that leaves skin comfortable.',
      'Sample product. A creamy cleanser for daily use that rinses clean.',
      'Massage onto damp skin, then rinse with lukewarm water.',
      array['cleanser', 'gentle'], false),
    ('glow-veil-moisturiser', 'dewlune', 'skincare', 'Glow Veil Moisturiser',
      'A cushiony cream with a satin, never-greasy finish.',
      'Sample product. A daily moisturiser with a soft-focus finish that works as a makeup base.',
      'Warm a pea-sized amount between fingertips and press over face and neck.',
      array['moisturiser', 'glow', 'base'], true),
    ('rose-satin-lip-tint', 'rosel-atelier', 'lips', 'Rose Satin Lip Tint',
      'Buildable colour with a soft satin sheen.',
      'Sample product. A lightweight tint that can be sheered out with a fingertip or layered for depth.',
      'Dab onto the centre of the lips and blend outward.',
      array['lip tint', 'rose', 'satin'], true),
    ('petal-balm', 'rosel-atelier', 'lips', 'Petal Lip Balm',
      'A cushiony balm with a whisper of colour.',
      'Sample product. A nourishing balm that leaves a sheer rosy wash.',
      'Apply as often as needed.',
      array['lip balm', 'sheer'], false),
    ('blush-bloom-cheek', 'rosel-atelier', 'makeup', 'Blush Bloom Cream Cheek',
      'A cream blush that melts into skin.',
      'Sample product. A cream-to-powder blush for a natural flush.',
      'Tap onto the apples of the cheeks and blend upward.',
      array['blush', 'cream', 'cheek'], true),
    ('mocha-skin-tint', 'mochera', 'makeup', 'Second Skin Tint',
      'Sheer, breathable coverage in warm undertones.',
      'Sample product. A light-coverage tint that evens tone while letting skin show through.',
      'Shake well. Blend with fingertips or a damp sponge.',
      array['skin tint', 'base', 'complexion'], true),
    ('soft-focus-palette', 'mochera', 'makeup', 'Soft Focus Eye Quad',
      'Four warm neutrals from champagne to mocha.',
      'Sample product. A four-pan palette of mattes and a champagne shimmer.',
      'Sweep the lightest shade across the lid and deepen at the crease.',
      array['eyeshadow', 'palette', 'neutral'], false),
    ('champagne-glow-drops', 'mochera', 'makeup', 'Champagne Glow Drops',
      'Liquid highlight for a lit-from-within sheen.',
      'Sample product. Mix into moisturiser or dot onto high points.',
      'Add one drop to moisturiser, or tap onto cheekbones.',
      array['highlighter', 'glow', 'champagne'], false),
    ('peach-silk-body-oil', 'peachline-lab', 'body', 'Peach Silk Body Oil',
      'A dry-touch oil for soft, glowing skin.',
      'Sample product. A fast-absorbing body oil with a soft sheen.',
      'Massage onto damp skin after showering.',
      array['body oil', 'glow'], false),
    ('velvet-hair-mist', 'peachline-lab', 'body', 'Velvet Hair Mist',
      'A light mist for shine and a soft scent.',
      'Sample product. A weightless leave-in mist for lengths and ends.',
      'Mist over dry or damp hair from a distance.',
      array['hair', 'mist'], false),
    ('blush-hour-eau', 'rosel-atelier', 'fragrance', 'Blush Hour Eau de Parfum',
      'A soft rose and musk skin scent.',
      'Sample product. A close-to-skin floral built for everyday wear.',
      'Spray onto pulse points.',
      array['fragrance', 'rose', 'musk'], false)
)
insert into public.products (slug, brand_id, category_id, name, short_description, description, how_to_use, tags, is_featured, is_sample)
select p.slug, b.id, c.id, p.name, p.short_description, p.description, p.how_to_use, p.tags, p.featured, true
from p
join public.brands b on b.slug = p.brand
join public.categories c on c.slug = p.category
on conflict (slug) do nothing;

with v(product, sku, name, swatch, price, compare_at, stock, sort) as (
  values
    ('dew-drop-hydrating-serum', 'SMP-DLN-SER-30', '30 ml', null, 64000, null, 24, 1),
    ('dew-drop-hydrating-serum', 'SMP-DLN-SER-50', '50 ml', null, 89000, null, 6, 2),
    ('cloud-milk-cleanser', 'SMP-DLN-CLN-150', '150 ml', null, 42000, null, 30, 1),
    ('glow-veil-moisturiser', 'SMP-DLN-MOI-50', '50 ml', null, 72000, 85000, 3, 1),
    ('rose-satin-lip-tint', 'SMP-RSL-TNT-01', 'Ballet Rose', '#D98FA0', 31000, null, 18, 1),
    ('rose-satin-lip-tint', 'SMP-RSL-TNT-02', 'Dusty Petal', '#B9565B', 31000, null, 0, 2),
    ('rose-satin-lip-tint', 'SMP-RSL-TNT-03', 'Peach Silk', '#F7C9B8', 31000, null, 9, 3),
    ('petal-balm', 'SMP-RSL-BLM-01', 'Sheer Blush', '#F9E1E3', 22000, null, 40, 1),
    ('blush-bloom-cheek', 'SMP-RSL-BLS-01', 'First Flush', '#D98FA0', 38000, null, 12, 1),
    ('blush-bloom-cheek', 'SMP-RSL-BLS-02', 'Golden Peach', '#EBC49A', 38000, null, 2, 2),
    ('mocha-skin-tint', 'SMP-MCH-TNT-01', 'Light Warm', '#E9C3A6', 54000, null, 10, 1),
    ('mocha-skin-tint', 'SMP-MCH-TNT-02', 'Medium Warm', '#C8946F', 54000, null, 7, 2),
    ('mocha-skin-tint', 'SMP-MCH-TNT-03', 'Deep Warm', '#684B43', 54000, null, 4, 3),
    ('soft-focus-palette', 'SMP-MCH-EYE-01', 'Champagne to Mocha', null, 69000, null, 0, 1),
    ('champagne-glow-drops', 'SMP-MCH-GLW-01', 'Champagne', '#EBC49A', 47000, null, 15, 1),
    ('peach-silk-body-oil', 'SMP-PCL-OIL-100', '100 ml', null, 52000, null, 20, 1),
    ('velvet-hair-mist', 'SMP-PCL-HMS-100', '100 ml', null, 36000, null, 11, 1),
    ('blush-hour-eau', 'SMP-RSL-EDP-30', '30 ml', null, 120000, null, 5, 1),
    ('blush-hour-eau', 'SMP-RSL-EDP-50', '50 ml', null, 165000, null, 2, 2)
)
insert into public.product_variants (product_id, sku, name, swatch_hex, price_cents, compare_at_cents, stock, sort_order)
select p.id, v.sku, v.name, v.swatch, v.price, v.compare_at, v.stock, v.sort
from v
join public.products p on p.slug = v.product
on conflict (sku) do nothing;

with cp(collection, product, sort) as (
  values
    ('everyday-glow-edit', 'cloud-milk-cleanser', 1),
    ('everyday-glow-edit', 'dew-drop-hydrating-serum', 2),
    ('everyday-glow-edit', 'glow-veil-moisturiser', 3),
    ('everyday-glow-edit', 'mocha-skin-tint', 4),
    ('everyday-glow-edit', 'champagne-glow-drops', 5),
    ('soft-rose-lips', 'rose-satin-lip-tint', 1),
    ('soft-rose-lips', 'petal-balm', 2),
    ('soft-rose-lips', 'blush-bloom-cheek', 3)
)
insert into public.collection_products (collection_id, product_id, sort_order)
select c.id, p.id, cp.sort
from cp
join public.collections c on c.slug = cp.collection
join public.products p on p.slug = cp.product
on conflict do nothing;
