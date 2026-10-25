"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { m } from "motion/react";
import { CartButton } from "@/components/cart/cart-button";
import { Drawer } from "@/components/ui/drawer";
import { CloseIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { NAV_LINKS } from "./nav-links";
import { SearchPanel } from "./search-panel";
import { Wordmark } from "./wordmark";

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [path, query] = href.split("?");
  const active = query
    ? pathname === path && params.toString() === query
    : href === "/shop"
      ? pathname === "/shop" && !params.get("category")
      : pathname.startsWith(path);
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

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
          </button>
          <Link href="/account" className="icon-btn hide-mobile" aria-label="Your account">
            <UserIcon />
          </Link>
          <CartButton />
        </div>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} side="left" label="Menu">
        <div className="drawer__head">
          <Wordmark onClick={() => setMenuOpen(false)} />
          <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <CloseIcon />
          </button>
        </div>
        <div className="drawer__body">
          <nav className="mobile-nav" aria-label="Mobile">
            {NAV_LINKS.map((l, i) => (
              <m.div
                key={l.href}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + i * 0.05 }}
              >
                <Link href={l.href} onClick={() => setMenuOpen(false)}>
                  {l.label}
                </Link>
              </m.div>
            ))}
          </nav>
        </div>
        <div className="drawer__foot stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
          <Link href="/account" className="btn btn--ghost btn--block" onClick={() => setMenuOpen(false)}>
            Account and orders
          </Link>
          <p className="arabic muted" style={{ textAlign: "center" }} lang="ar">
            نضارتك. لمعتك. إنتِ.
          </p>
        </div>
      </Drawer>

      <Drawer open={searchOpen} onClose={() => setSearchOpen(false)} side="top" label="Search">
        <SearchPanel onClose={() => setSearchOpen(false)} />
      </Drawer>
    </header>
  );
}
