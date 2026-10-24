/*
 * Art-directed placeholder imagery. Until real product photography exists,
 * each product renders a vector still life in the brand palette, shaped by its
 * category and tinted by its shade. It is always labelled as a placeholder by
 * the surrounding UI (see PlaceholderTag) so it is never mistaken for a photo.
 */

type Shape = "dropper" | "tube" | "compact" | "perfume" | "pump" | "jar";

const BACKDROPS = [
  ["#F9E1E3", "#F7C9B8"],
  ["#FFF6F0", "#F9E1E3"],
  ["#F7C9B8", "#EBC49A"],
  ["#F9E1E3", "#EBC49A"],
] as const;

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shapeFor(categorySlug: string | null | undefined, slug: string): Shape {
  if (/moistur|cream|balm/.test(slug)) return "jar";
  if (/palette|quad|cheek|blush-bloom/.test(slug)) return "compact";
  switch (categorySlug) {
    case "skincare":
      return "dropper";
    case "lips":
      return "tube";
    case "makeup":
      return "dropper";
    case "fragrance":
      return "perfume";
    case "body":
      return "pump";
    default:
      return "dropper";
  }
}

type Props = {
  slug: string;
  name: string;
  brandName: string;
  categorySlug?: string | null;
  tint?: string | null;
  /** Alternate framings for the gallery. */
  view?: "front" | "detail" | "texture";
  /** Distinguishes multiple renders of the same product on one page. */
  instance?: string;
  className?: string;
  decorative?: boolean;
};

export function ProductArt({
  slug,
  name,
  brandName,
  categorySlug,
  tint,
  view = "front",
  instance = "",
  className,
  decorative = false,
}: Props) {
  const h = hash(slug);
  const [bgA, bgB] = BACKDROPS[h % BACKDROPS.length];
  const shade = tint ?? ["#D98FA0", "#F7C9B8", "#EBC49A", "#B9565B"][h % 4];
  const shape = shapeFor(categorySlug, slug);
  const id = `pa-${h.toString(36)}-${view}${instance ? `-${instance}` : ""}`;
  const tilt = ((h >> 4) % 7) - 3;
  const label = `${name} by ${brandName}, illustrative placeholder image`;

  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": label } as const);

  if (view === "texture") {
    return (
      <svg viewBox="0 0 400 500" className={className} preserveAspectRatio="xMidYMid slice" {...a11y}>
        <defs>
          <radialGradient id={`${id}-tex`} cx="40%" cy="35%" r="80%">
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.35" stopColor={shade} stopOpacity="0.85" />
            <stop offset="1" stopColor={shade} />
          </radialGradient>
        </defs>
        <rect width="400" height="500" fill={bgA} />
        <path
          d="M40 330 C 90 210, 210 170, 300 220 S 380 330, 330 380 S 120 440, 40 330 Z"
          fill={`url(#${id}-tex)`}
        />
        <path d="M110 300 C 160 250, 230 240, 280 270" stroke="#fff" strokeOpacity="0.7" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="300" cy="150" r="14" fill="#fff" fillOpacity="0.55" />
        <circle cx="330" cy="190" r="7" fill="#fff" fillOpacity="0.45" />
        <text x="40" y="470" fontSize="13" letterSpacing="3" fill="#684B43" fontFamily="var(--font-sans), sans-serif">
          TEXTURE STUDY
        </text>
      </svg>
    );
  }

  const zoom = view === "detail" ? "translate(-140 -170) scale(1.7)" : "";

  return (
    <svg viewBox="0 0 400 500" className={className} preserveAspectRatio="xMidYMid slice" {...a11y}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={bgA} />
          <stop offset="1" stopColor={bgB} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="30%" r="60%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade} stopOpacity="0.75" />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C99A68" />
          <stop offset="0.45" stopColor="#F6DDBE" />
          <stop offset="1" stopColor="#B98654" />
        </linearGradient>
        <linearGradient id={`${id}-mocha`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3E2B26" />
          <stop offset="0.5" stopColor="#684B43" />
          <stop offset="1" stopColor="#3E2B26" />
        </linearGradient>
      </defs>

      <rect width="400" height="500" fill={`url(#${id}-bg)`} />
      <ellipse cx="200" cy="150" rx="210" ry="170" fill={`url(#${id}-glow)`} />
      {/* Arch backdrop: the brand's recurring frame. */}
      <path d="M90 430 V 210 a110 110 0 0 1 220 0 V 430 Z" fill="#fff" fillOpacity="0.28" />

      <g transform={zoom}>
        <ellipse cx="200" cy="432" rx="96" ry="12" fill="#684B43" fillOpacity="0.16" />
        <g transform={`rotate(${tilt} 200 300)`}>
          {shape === "dropper" && <Dropper id={id} brandName={brandName} />}
          {shape === "tube" && <Tube id={id} brandName={brandName} />}
          {shape === "compact" && <Compact id={id} brandName={brandName} />}
          {shape === "perfume" && <Perfume id={id} brandName={brandName} />}
          {shape === "pump" && <Pump id={id} brandName={brandName} />}
          {shape === "jar" && <Jar id={id} brandName={brandName} />}
        </g>
        {/* Dew drops */}
        <circle cx="292" cy="214" r="9" fill="#fff" fillOpacity="0.6" />
        <circle cx="289" cy="211" r="3" fill="#fff" />
        <circle cx="122" cy="300" r="6" fill="#fff" fillOpacity="0.5" />
      </g>
    </svg>
  );
}

type PartProps = { id: string; brandName: string };

function Label({ x, y, brandName, color = "#684B43", size = 13 }: { x: number; y: number; brandName: string; color?: string; size?: number }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={size}
      letterSpacing="2.5"
      fill={color}
      style={{ fontFamily: "var(--font-bodoni), serif" }}
    >
      {brandName.toUpperCase()}
    </text>
  );
}

function Dropper({ id, brandName }: PartProps) {
  return (
    <g>
      <rect x="150" y="250" width="100" height="180" rx="22" fill={`url(#${id}-shade)`} />
      <rect x="150" y="250" width="100" height="180" rx="22" fill={`url(#${id}-glass)`} />
      <rect x="166" y="300" width="68" height="70" rx="4" fill="#FFF6F0" fillOpacity="0.85" />
      <Label x={200} y={330} brandName={brandName} size={10} />
      <line x1="178" y1="344" x2="222" y2="344" stroke="#EBC49A" strokeWidth="1" />
      <rect x="168" y="222" width="64" height="32" rx="6" fill={`url(#${id}-gold)`} />
      <path d="M178 222 V 160 a22 22 0 0 1 44 0 V 222 Z" fill={`url(#${id}-mocha)`} />
      <rect x="160" y="262" width="10" height="150" rx="5" fill="#fff" fillOpacity="0.45" />
    </g>
  );
}

function Tube({ id, brandName }: PartProps) {
  return (
    <g>
      <rect x="160" y="290" width="80" height="140" rx="10" fill={`url(#${id}-mocha)`} />
      <rect x="160" y="282" width="80" height="16" rx="4" fill={`url(#${id}-gold)`} />
      <path d="M170 282 V 210 L 230 180 V 282 Z" fill={`url(#${id}-shade)`} />
      <path d="M170 282 V 210 L 230 180 V 282 Z" fill={`url(#${id}-glass)`} />
      <rect x="168" y="300" width="8" height="120" rx="4" fill="#fff" fillOpacity="0.18" />
      <Label x={200} y={370} brandName={brandName} color="#EBC49A" size={9} />
      <rect x="252" y="330" width="72" height="100" rx="10" fill={`url(#${id}-mocha)`} opacity="0.92" />
      <rect x="252" y="330" width="72" height="12" rx="4" fill={`url(#${id}-gold)`} />
    </g>
  );
}

function Compact({ id, brandName }: PartProps) {
  return (
    <g>
      <ellipse cx="200" cy="232" rx="112" ry="30" fill={`url(#${id}-gold)`} transform="rotate(-8 200 232)" />
      <ellipse cx="200" cy="228" rx="98" ry="22" fill="#FFF6F0" fillOpacity="0.7" transform="rotate(-8 200 228)" />
      <ellipse cx="200" cy="372" rx="120" ry="44" fill={`url(#${id}-mocha)`} />
      <ellipse cx="200" cy="360" rx="120" ry="44" fill={`url(#${id}-gold)`} />
      <ellipse cx="200" cy="356" rx="96" ry="32" fill={`url(#${id}-shade)`} />
      <ellipse cx="180" cy="348" rx="40" ry="10" fill="#fff" fillOpacity="0.35" />
      <Label x={200} y={418} brandName={brandName} size={11} />
    </g>
  );
}

function Perfume({ id, brandName }: PartProps) {
  return (
    <g>
      <rect x="186" y="196" width="28" height="30" rx="3" fill={`url(#${id}-gold)`} />
      <rect x="168" y="168" width="64" height="34" rx="8" fill={`url(#${id}-gold)`} />
      <path d="M140 240 h120 l14 26 v150 a14 14 0 0 1 -14 14 h-120 a14 14 0 0 1 -14 -14 v-150 Z" fill={`url(#${id}-shade)`} />
      <path d="M140 240 h120 l14 26 v150 a14 14 0 0 1 -14 14 h-120 a14 14 0 0 1 -14 -14 v-150 Z" fill={`url(#${id}-glass)`} />
      <rect x="158" y="310" width="84" height="56" rx="2" fill="#FFF6F0" fillOpacity="0.85" />
      <Label x={200} y={343} brandName={brandName} size={10} />
      <rect x="140" y="262" width="10" height="150" rx="5" fill="#fff" fillOpacity="0.4" />
    </g>
  );
}

function Pump({ id, brandName }: PartProps) {
  return (
    <g>
      <rect x="156" y="230" width="88" height="200" rx="26" fill={`url(#${id}-shade)`} />
      <rect x="156" y="230" width="88" height="200" rx="26" fill={`url(#${id}-glass)`} />
      <rect x="176" y="206" width="48" height="28" rx="6" fill={`url(#${id}-gold)`} />
      <rect x="192" y="166" width="16" height="44" fill={`url(#${id}-gold)`} />
      <path d="M180 160 h60 a8 8 0 0 1 0 16 h-60 Z" fill={`url(#${id}-gold)`} />
      <rect x="170" y="300" width="60" height="70" rx="4" fill="#FFF6F0" fillOpacity="0.85" />
      <Label x={200} y={340} brandName={brandName} size={9} />
    </g>
  );
}

function Jar({ id, brandName }: PartProps) {
  return (
    <g>
      <rect x="126" y="300" width="148" height="128" rx="26" fill={`url(#${id}-shade)`} />
      <rect x="126" y="300" width="148" height="128" rx="26" fill={`url(#${id}-glass)`} />
      <rect x="120" y="258" width="160" height="50" rx="14" fill={`url(#${id}-gold)`} />
      <rect x="150" y="340" width="100" height="50" rx="4" fill="#FFF6F0" fillOpacity="0.85" />
      <Label x={200} y={370} brandName={brandName} size={10} />
      <rect x="136" y="312" width="10" height="100" rx="5" fill="#fff" fillOpacity="0.4" />
    </g>
  );
}

export function PlaceholderTag() {
  return <span className="placeholder-tag">Placeholder image</span>;
}
