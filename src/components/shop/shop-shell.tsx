"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { HoverEffect } from "@/components/aceternity/card-hover-effect";
import { Drawer } from "@/components/ui/drawer";
import { CloseIcon, FilterIcon, SearchIcon } from "@/components/ui/icons";

type Option = { value: string; label: string };

export type ShopFilterData = {
  brands: Option[];
  categories: Option[];
  sorts: Option[];
};

type Update = (changes: Record<string, string | null>) => void;

const FILTER_KEYS = ["brand", "category", "in_stock", "q"] as const;
const CLEAR_ALL = { brand: null, category: null, in_stock: null, q: null };

function useShopParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update: Update = (changes) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  return { params, update, pending };
}

function FilterControls({
  data,
  update,
  params,
  showCategory,
}: {
  data: ShopFilterData;
  update: Update;
  params: URLSearchParams;
  showCategory: boolean;
}) {
  const brand = params.get("brand") ?? "";
  const category = params.get("category") ?? "";
  const inStock = params.get("in_stock") === "1";

  return (
    <>
      {showCategory && (
        <fieldset className="filter-group">
          <legend>Category</legend>
          <div className="filter-list">
            <button type="button" className="chip" aria-pressed={!category} onClick={() => update({ category: null })}>
              All categories
            </button>
            {data.categories.map((c) => (
              <button
                key={c.value}
                type="button"
                className="chip"
                aria-pressed={category === c.value}
                onClick={() => update({ category: category === c.value ? null : c.value })}
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="filter-group">
        <legend>Brand</legend>
        <div className="filter-list">
          <button type="button" className="chip" aria-pressed={!brand} onClick={() => update({ brand: null })}>
            All brands
          </button>
          {data.brands.map((b) => (
            <button
              key={b.value}
              type="button"
              className="chip"
              aria-pressed={brand === b.value}
              onClick={() => update({ brand: brand === b.value ? null : b.value })}
            >
              {b.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="filter-group">
        <legend>Availability</legend>
        <label className="toggle">
          <input type="checkbox" checked={inStock} onChange={(e) => update({ in_stock: e.target.checked ? "1" : null })} />
          In stock only
        </label>
      </fieldset>
    </>
  );
}

/** The category index under the collection introduction. */
function CategoryRail({ data, update, params }: { data: ShopFilterData; update: Update; params: URLSearchParams }) {
  const category = params.get("category") ?? "";
  const items = [
    { value: "", label: "All", pressed: !category },
    ...data.categories.map((c) => ({ value: c.value, label: c.label, pressed: category === c.value })),
  ];

  const railRef = useRef<HTMLDivElement>(null);

  // On phones the index scrolls sideways: keep the current category in view
  // (for example after choosing Body & Hair in the Filters sheet).
  useEffect(() => {
    const rail = railRef.current;
    const current = rail?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (!rail || !current || rail.scrollWidth <= rail.clientWidth) return;
    const edge = 24;
    const r = rail.getBoundingClientRect();
    const c = current.getBoundingClientRect();
    if (c.left < r.left + edge || c.right > r.right - edge) rail.scrollLeft += c.left - r.left - edge;
  }, [category]);

  return (
    <div className="collection-rail" ref={railRef}>
      <HoverEffect
        label="Category"
        items={items}
        className="collection-rail__list"
        itemClassName="collection-rail__item"
        onSelect={(value) => update({ category: value && value !== category ? value : null })}
      />
    </div>
  );
}

/** Removable tokens for the filters in use, so they can be undone in one tap. */
function ActiveFilters({ data, update, params }: { data: ShopFilterData; update: Update; params: URLSearchParams }) {
  const labelOf = (list: Option[], value: string) => list.find((o) => o.value === value)?.label;
  const tokens: { key: string; label: string }[] = [];
  const category = params.get("category");
  const brand = params.get("brand");
  const q = params.get("q");
  if (category) tokens.push({ key: "category", label: labelOf(data.categories, category) ?? category });
  if (brand) tokens.push({ key: "brand", label: labelOf(data.brands, brand) ?? brand });
  if (params.get("in_stock") === "1") tokens.push({ key: "in_stock", label: "In stock only" });
  if (q) tokens.push({ key: "q", label: `“${q}”` });
  if (tokens.length === 0) return null;

  return (
    <div className="collection-active">
      <p className="visually-hidden" id="active-filters-label">
        Filters in use
      </p>
      <ul aria-labelledby="active-filters-label">
        {tokens.map((t) => (
          <li key={t.key}>
            <button
              type="button"
              className="collection-token"
              aria-label={`Remove filter: ${t.label}`}
              onClick={() => update({ [t.key]: null })}
            >
              {t.label}
              <CloseIcon size={14} />
            </button>
          </li>
        ))}
      </ul>
      {tokens.length > 1 && (
        <button type="button" className="collection-clear" onClick={() => update(CLEAR_ALL)}>
          Clear all
        </button>
      )}
    </div>
  );
}

export function ShopShell({ data, count, children }: { data: ShopFilterData; count: number; children: ReactNode }) {
  const { params, update, pending } = useShopParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  // Follow URL changes made elsewhere (e.g. the header search).
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== query.trim()) setQuery(urlQuery);
  }
  const sort = params.get("sort") ?? "featured";
  const activeFilters = FILTER_KEYS.filter((k) => params.get(k)).length;

  // Debounced search-as-you-type, kept in the URL so results are shareable.
  useEffect(() => {
    if (query.trim() === urlQuery) return;
    const timer = setTimeout(() => update({ q: query.trim() || null }), 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="collection">
      <CategoryRail data={data} update={update} params={params} />

      <div className="collection-layout">
        <aside className="collection-refine" aria-label="Filters">
          <p className="collection-refine__title">Refine</p>
          <FilterControls data={data} update={update} params={params} showCategory={false} />
        </aside>

        <div className="collection-main">
          <div className="collection-toolbar">
            <form className="collection-search" role="search" onSubmit={(e) => e.preventDefault()}>
              <SearchIcon size={18} />
              <label htmlFor="shop-search" className="visually-hidden">
                Search the shop
              </label>
              <input
                id="shop-search"
                className="input"
                type="search"
                placeholder="Search products or brands"
                value={query}
                maxLength={80}
                onChange={(e) => setQuery(e.target.value)}
              />
            </form>
            <div className="collection-toolbar__row">
              <p className="collection-count" aria-live="polite">
                {pending ? "Updating…" : `${count} ${count === 1 ? "product" : "products"}`}
              </p>
              <div className="collection-toolbar__actions">
                <button type="button" className="collection-filters-toggle" onClick={() => setSheetOpen(true)}>
                  <FilterIcon size={18} /> Filters{activeFilters ? ` (${activeFilters})` : ""}
                </button>
                <div className="collection-sort">
                  <label htmlFor="shop-sort">Sort by</label>
                  <select
                    id="shop-sort"
                    value={sort}
                    onChange={(e) => update({ sort: e.target.value === "featured" ? null : e.target.value })}
                  >
                    {data.sorts.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <ActiveFilters data={data} update={update} params={params} />
          </div>
          <h2 className="visually-hidden">Products</h2>
          <div className="results" data-pending={pending} aria-busy={pending}>
            {children}
          </div>
        </div>
      </div>

      <Drawer open={sheetOpen} onClose={() => setSheetOpen(false)} side="bottom" label="Filters">
        <div className="sheet__grabber" aria-hidden="true" />
        <div className="drawer__head">
          <h2 className="title-md">Filters</h2>
          <button type="button" className="icon-btn" aria-label="Close filters" onClick={() => setSheetOpen(false)}>
            <CloseIcon />
          </button>
        </div>
        <div className="drawer__body stack" style={{ "--stack-gap": "2rem" } as React.CSSProperties}>
          <FilterControls data={data} update={update} params={params} showCategory />
        </div>
        <div className="drawer__foot cluster" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn--ghost" onClick={() => update(CLEAR_ALL)}>
            Clear all
          </button>
          <button type="button" className="btn" onClick={() => setSheetOpen(false)}>
            Show {count} {count === 1 ? "result" : "results"}
          </button>
        </div>
      </Drawer>
    </div>
  );
}

/** Placeholder with the same shape as the collection while results load. */
export function ShopShellSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="collection" aria-hidden="true">
      <div className="collection-rail collection-rail--skeleton" />
      <div className="collection-layout">
        <div className="collection-refine" />
        <div className="collection-main">
          <div className="collection-toolbar collection-toolbar--skeleton" />
          {children}
        </div>
      </div>
    </div>
  );
}
