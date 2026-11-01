"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { m } from "motion/react";
import { CartButton } from "@/components/cart/cart-button";
import { Drawer } from "@/components/ui/drawer";
import { ArrowRightIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { NAV_LINKS } from "./nav-links";
import { SearchPanel } from "./search-panel";
import { Wordmark } from "./wordmark";

/** Whether a navigation link points at the page being shown. */
function isCurrent(href: string, pathname: string, params: Pick<URLSearchParams, "get" | "toString">) {
  const [path, query] = href.split("?");
  return query
    ? pathname === path && params.toString() === query
    : href === "/shop"
      ? pathname === "/shop" && !params.get("category")
      : pathname.startsWith(path);
}

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = isCurrent(href, pathname, params);
  return (
    <Link href={href} className="link-underline" aria-current={active ? "page" : undefined} onClick={onClick}>
      {label}
    </Link>
  );
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  return (
    <>
      {NAV_LINKS.map((l) => (
        <NavLink key={l.href} {...l} onClick={onClick} />
      ))}
    </>
  );
}

function PlainNavLinks() {
  return (
    <>
      {NAV_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="link-underline">
          {l.label}
        </Link>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- Phone menu */

const MENU_EASE = [0.22, 1, 0.36, 1] as const;

/** One staggered row; Motion drops the slide (keeps the fade) under reduced motion. */
function MenuRow({ index, children }: { index: number; children: ReactNode }) {
  return (
    <m.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.08 + index * 0.04, duration: 0.36, ease: MENU_EASE }}
    >
      {children}
    </m.li>
  );
}

function MenuList({ onNavigate, isActive }: { onNavigate: () => void; isActive?: (href: string) => boolean }) {
  return (
    <ul role="list">
      {NAV_LINKS.map((l, i) => (
        <MenuRow key={l.href} index={i}>
          <Link
            href={l.href}
            className="menu__link"
            aria-current={isActive?.(l.href) ? "page" : undefined}
            onClick={onNavigate}
          >
            <span className="menu__link-label">{l.label}</span>
            <ArrowRightIcon size={18} />
          </Link>
        </MenuRow>
      ))}
    </ul>
  );
}

function CurrentMenuList({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  return <MenuList onNavigate={onNavigate} isActive={(href) => isCurrent(href, pathname, params)} />;
}

const MENU_LINKS = [
  { href: "/account", label: "Account and orders" },
  { href: "/help/delivery", label: "Delivery details" },
] as const;

function MenuContent({ onClose }: { onClose: () => void }) {
  const shopId = useId();
  const helpId = useId();
  return (
    <>
      <div className="drawer__head menu__head">
        <Wordmark onClick={onClose} />
        <button type="button" className="icon-btn menu__close" aria-label="Close menu" onClick={onClose} data-autofocus>
          <span className="menu__close-label" aria-hidden="true">
            Close
          </span>
          <CloseIcon />
        </button>
      </div>
      <div className="drawer__body menu__body">
        <section className="menu__group">
          <h2 className="menu__eyebrow" id={shopId}>
            The shop
          </h2>
          <nav className="menu__nav" aria-labelledby={shopId}>
            <Suspense fallback={<MenuList onNavigate={onClose} />}>
              <CurrentMenuList onNavigate={onClose} />
            </Suspense>
          </nav>
        </section>
        <section className="menu__group">
          <h2 className="menu__eyebrow" id={helpId}>
            Account and help
          </h2>
          <nav className="menu__links" aria-labelledby={helpId}>
            <ul role="list">
              {MENU_LINKS.map((l, i) => (
                <MenuRow key={l.href} index={NAV_LINKS.length + i}>
                  <Link href={l.href} onClick={onClose}>
                    {l.label}
                  </Link>
                </MenuRow>
              ))}
            </ul>
          </nav>
        </section>
      </div>
      <div className="drawer__foot menu__foot">
        <p className="menu__tagline">Your everyday glow</p>
        <p className="arabic menu__arabic" lang="ar">
          نضارتك. لمعتك. إنتِ.
        </p>
      </div>
    </>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // The menu belongs to the phone layout: if the window grows past it (a tablet
  // rotated to landscape), close the menu rather than leave it over the page.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 901px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="site-header" data-scrolled={scrolled}>
      <div className="container site-header__bar">
        <button
          type="button"
          className="icon-btn menu-toggle"
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon />
        </button>
        <nav className="site-header__nav" aria-label="Main">
          <Suspense fallback={<PlainNavLinks />}>
            <NavLinks />
          </Suspense>
        </nav>
        <Wordmark />
        <div className="site-header__actions">
          <button type="button" className="icon-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
            <SearchIcon />
            <span className="site-header__label" aria-hidden="true">
              Search
            </span>
          </button>
          <Link href="/account" className="icon-btn hide-mobile" aria-label="Your account">
            <UserIcon />
            <span className="site-header__label" aria-hidden="true">
              Account
            </span>
          </Link>
          <CartButton label="Bag" />
        </div>
      </div>

      <Drawer open={menuOpen} onClose={closeMenu} side="left" label="Menu">
        <MenuContent onClose={closeMenu} />
      </Drawer>

      <Drawer open={searchOpen} onClose={() => setSearchOpen(false)} side="top" label="Search">
        <SearchPanel onClose={() => setSearchOpen(false)} />
      </Drawer>
    </header>
  );
}
