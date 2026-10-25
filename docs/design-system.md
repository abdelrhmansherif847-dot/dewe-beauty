# DEWÉ BEAUTY design system

The single source of truth is `src/app/globals.css` (tokens on `:root`, then
components). This file explains the decisions so the system can grow without
drifting. Figma mirrors the same tokens; when the two disagree, the CSS wins
and Figma gets updated.

## Art direction

**Idea: the glow of skin after care.** Dew on a petal, light through a glass
dropper, a pressed powder catching the sun. Everything should feel luminous,
tactile and calm, like an editorial beauty spread rather than a template shop.

- **The arch** is the recurring frame. It appears in the hero, category tiles,
  product art and empty states (`--radius-arch`). Use it for framing objects,
  never for buttons or form fields.
- **Warm light, warm shadow.** Backgrounds are ivory and blush washes. Shadows
  are tinted with mocha (`--shadow-soft`, `--shadow-lift`), never grey.
- **Editorial rhythm.** Numbered sections (`01 Discover`, `02 Featured`), a
  serif headline with one italic accent word ("Your everyday *glow*"), and
  generous vertical space (`--section-y`).
- **Honesty is part of the look.** Sample brands and products carry a visible
  "Sample product" or "Sample brand" badge, illustrative art carries a
  "Placeholder image" tag, and the store makes no claims it can't back up (no
  reviews, ratings, sales counts, certifications or partner logos).

## Colour

| Token | Hex | Role |
| --- | --- | --- |
| `--blush` | #F9E1E3 | Section washes, badges, thumbnails |
| `--peach` | #F7C9B8 | Gradients, highlights, swatches |
| `--ivory` | #FFF6F0 | Page background |
| `--rose-mauve` | #D98FA0 | Decorative fills, dew, illustration |
| `--dusty-rose` | #B9565B | Accent for large text, icons, the italic accent word |
| `--champagne` | #EBC49A | Hairlines, gold details, focus glow |
| `--mocha` | #684B43 | Secondary text (7.4:1 on ivory) |
| `--mocha-deep` | #3E2B26 | Body text, primary buttons (12.5:1 on ivory) |
| `--rose-ink` | #9A4449 | Small accent text such as eyebrows and links (6:1 on ivory) |

The first seven are the official palette. `--mocha-deep` and `--rose-ink` are
darker derivatives added for accessibility: dusty rose measures 4.33:1 on
ivory, which fails WCAG AA for small text, so small rose text uses
`--rose-ink` and dusty rose is kept for large display text, icons and fills.

Semantic roles (`--bg`, `--surface`, `--text`, `--text-soft`, `--accent`,
`--accent-ink`, `--hairline`, `--focus`, `--success`, `--danger`) are what
components use. Reach for a role before a raw brand colour.

## Typography

| Use | Family | Notes |
| --- | --- | --- |
| Display and headings | Bodoni Moda (`--font-display`) | High-contrast didone. Italic for the single accent word. |
| Interface and body | Manrope (`--font-sans`) | Clean geometric sans. Uppercase with `--tracking-eyebrow` for eyebrows, buttons and labels. |
| Arabic | Amiri (`--font-arabic`) | Brand line "نضارتك. لمعتك. إنتِ." set with `dir="rtl"` and `lang="ar"`. |

All three are self-hosted through `next/font` (no runtime requests to Google).
Amiri is not preloaded because it is only used for the brand line.

The scale is fluid (`--step--1` to `--step-5`, built with `clamp()`), so type
grows smoothly from phone to desktop without breakpoint jumps.

## Space, layout and shape

- 4px base spacing scale, `--space-1` (4px) to `--space-9` (112px).
- Content width `--container` (1320px) with fluid side gutters `--gutter`.
- Radii: `--radius-sm` 6px (inputs inside chips), `--radius-md` 14px (cards,
  thumbnails), `--radius-lg` 28px (panels, gallery), `--radius-pill` (buttons,
  chips, badges) and `--radius-arch`.
- Product grids: 2 columns on phones, 3 on tablets, 4 to 5 on desktop.

## Components

Buttons (`.btn`, `.btn--ghost`, `.btn--sm`, `.btn--block`), chips and
toggles, badges (`--sample`, `--sale`, `--soldout`, `--low`), form fields with
hint and error text, product card, product gallery, variant options with
swatches, stock line, quantity stepper, accordion, sticky buy bar, drawer,
bottom sheet, search panel, toast, totals list, panels, tabs, order table and
status pills, empty states, skeletons and spinners. Every interactive control
has a visible focus ring (`--focus`, 2px offset).

## Motion language

Motion should feel like light and moisture settling, never like a website
performing. It confirms what the shopper did, then stops.

| Token | Value | Typical use |
| --- | --- | --- |
| `--dur-instant` | 120ms | Press states, colour changes |
| `--dur-quick` | 200ms | Hover, chip toggles, thumbnails |
| `--dur-base` | 320ms | Reveals of small elements, drawers' contents |
| `--dur-slow` | 560ms | Section reveals, gallery crossfade |
| `--dur-cinematic` | 900ms | Hero entrance, dew forming |
| `--ease-out` | cubic-bezier(.22,1,.36,1) | Default: settles like a drop landing |
| `--ease-in-out` | cubic-bezier(.65,0,.35,1) | Light sweeps |
| `--ease-spring` | cubic-bezier(.34,1.56,.64,1) | Feedback only (bag icon bump) |

Where each technique is used:

- **CSS** for anything that should work before JavaScript loads: the hero's
  word-by-word rise and staggered fades, the light sweep across the arch, dew
  drops forming once, the glint, button sheen on hover, card image zoom,
  skeleton shimmer and the loading drop.
- **Motion for React** (`motion/react`, `LazyMotion` with `domAnimation`, so
  only the needed features ship) for things that enter and leave: the bag,
  menu and search drawers, the mobile filter sheet, the toast, cart lines
  being removed, the gallery crossfade, the add-to-bag confirmation and the
  bag icon bump.
- **IntersectionObserver reveals** (`data-reveal`) only for content below the
  fold, so nothing visible on load waits for script.
- **Lottie** was evaluated for dew and glint loops. It is not used: the CSS
  and SVG versions are a few hundred bytes instead of a player plus JSON, and
  the LottieFiles asset host was not reachable from the build environment.

Rules:

1. No looping ambient animation. Dew forms once; the glint plays once.
2. No parallax, floating particle fields or video backgrounds.
3. Nothing blocks shopping: buttons are clickable during any animation, and
   drawers can be closed mid-transition.
4. `prefers-reduced-motion: reduce` is respected everywhere: `MotionConfig
   reducedMotion="user"` turns off transforms in Motion, and a global CSS block
   removes CSS animations and transitions while keeping state changes visible.

## Accessibility

- Text colours meet WCAG AA (see the colour table); small rose text uses
  `--rose-ink`.
- Skip link to `#main`, landmarks (`header`, `nav`, `main`, `footer`), one
  `h1` per page and a logical heading order.
- Drawers and sheets are modal dialogs: focus moves in, is trapped, returns to
  the trigger on close, Escape and the scrim close them, and page scroll is
  locked.
- Variant options are a radio group with sold-out shades announced. Price,
  quantity, result counts and add-to-bag confirmations are announced through
  live regions.
- Touch targets are at least 44px on phones.

## Imagery

Until real product photography exists, products use generated SVG still lifes
(`src/components/art/product-art.tsx`): a dropper, tube, compact, perfume,
pump or jar, tinted by the selected shade, with front, detail and texture
views. They are always tagged "Placeholder image". Real photos uploaded to
Supabase Storage replace them automatically (any `product_images` row with
`is_placeholder = false`) and are served through `next/image` as AVIF or WebP.

Photography direction for the shoot: soft daylight, warm ivory and blush
surfaces, one product per frame on an arch or plinth, visible texture swatches,
real skin with no heavy retouching, and no stock imagery.
