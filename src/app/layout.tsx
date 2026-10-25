import type { Metadata, Viewport } from "next";
import { Amiri, Bodoni_Moda, Manrope } from "next/font/google";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartToast } from "@/components/cart/cart-toast";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MotionProvider } from "@/components/motion/motion-provider";
import { RevealObserver } from "@/components/motion/reveal-observer";
import { siteUrl } from "@/lib/env";
import "@/styles/tailwind.css";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DEWÉ BEAUTY · Your everyday glow",
    template: "%s · DEWÉ BEAUTY",
  },
  description:
    "DEWÉ BEAUTY is a multi-brand beauty store for skincare, makeup and fragrance, with cash on delivery on every order.",
  openGraph: {
    siteName: "DEWÉ BEAUTY",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFF6F0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${manrope.variable} ${amiri.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <MotionProvider>
          <CartProvider>
            <AnnouncementBar />
            <SiteHeader />
            <main id="main">{children}</main>
            <SiteFooter />
            <CartDrawer />
            <CartToast />
          </CartProvider>
        </MotionProvider>
        <RevealObserver />
      </body>
    </html>
  );
}
