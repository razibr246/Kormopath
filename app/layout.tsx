import type { Metadata, Viewport } from "next";
import { Fraunces, Noto_Serif_Bengali, JetBrains_Mono, Hind_Siliguri } from "next/font/google";
import "@fontsource-variable/inter";
import "./globals.css";
import { StorageNotice } from "@/components/layout/StorageNotice";
import { LazyBuddy, LazyCommandPalette } from "@/components/buddy/LazyGlobals";
import { BuildathonSticker } from "@/components/layout/BuildathonSticker";
import { PwaSupport } from "@/components/layout/PwaSupport";
import { KormoPathMarkDefs } from "@/components/brand/KormoPathMarkDefs";

// Self-hosted at build time by next/font: no request to Google from the visitor's browser.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"], preload: false });
// The Bangla fonts are preloaded: the home hero is Bangla, and fonts that arrived after the first paint reflowed the
// heading and pushed the search box down (layout shift 0.18). next/font also adds a size-matched fallback.
const bnSerif = Noto_Serif_Bengali({ subsets: ["bengali"], variable: "--font-bn-serif", display: "swap", weight: ["600", "700"], preload: true });
const hind = Hind_Siliguri({ subsets: ["bengali", "latin"], variable: "--font-hind", display: "swap", weight: ["400", "600", "700"], preload: true });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap", weight: ["400", "700"], preload: false });

export const metadata: Metadata = {
  metadataBase: new URL("https://kormopath.vercel.app"),
  manifest: "/manifest.webmanifest",
  title: {
    default: "KormoPath — Practical tools for work, study, farming and daily life",
    template: "%s | KormoPath",
  },
  description:
    "Bangladesh-focused tools for study planning, health information, household budgeting, farming, interview practice, freelance payments and contracts. Private app data stays in your browser.",
  keywords: [
    "KormoPath",
    "কর্মপথ",
    "AI Platform Bangladesh",
    "Bangladesh study planner",
    "Bangladesh agriculture tools",
    "Bangla household budget",
    "Skill Passport",
    "NBR ITES Tax Exemption",
    "Bangladesh Bank 2.5% Export Incentive",
    "Fiverr vs Direct Client",
    "Payoneer bKash fees",
  ],
  authors: [{ name: "KormoPath" }],
  creator: "KormoPath",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "KormoPath — Practical tools for Bangladesh",
    description:
      "Practical Bangladesh-focused tools for study, health information, budgeting, farming, interview practice and freelance work.",
    url: "https://kormopath.vercel.app",
    siteName: "KormoPath AI",
    images: [
      {
        url: "/og-kormopath.png",
        width: 1200,
        height: 630,
        alt: "KormoPath, কর্মপথ: practical tools for work, study, farming and daily life in Bangladesh",
      },
    ],
    locale: "bn_BD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KormoPath — Practical tools for Bangladesh",
    description:
      "Practical tools for study, health information, budgeting, farming, interview practice and freelance work in Bangladesh.",
    images: ["/og-kormopath.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fcf9f3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "KormoPath",
    alternateName: "কর্মপথ",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Practical web apps for study planning, health information, household budgeting, farming, interview practice and freelance work in Bangladesh.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Study and admissions planning",
      "Prescription text reading and medication safety flags",
      "Household budgeting and product research",
      "Farm planning, market quote tracking and transport tools",
      "Interview practice, freelance fee comparison and client documents",
    ],
  };

  return (
    <html lang="bn" className={`scroll-smooth ${fraunces.variable} ${bnSerif.variable} ${hind.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased selection:bg-kept-soft selection:text-kept" suppressHydrationWarning>
        <KormoPathMarkDefs />
        <StorageNotice />
        <a className="skip-link" href="#main">মূল কনটেন্টে যান</a>
        <BuildathonSticker />
        {children}
        <LazyCommandPalette />
        <LazyBuddy />
        <PwaSupport />
      </body>
    </html>
  );
}
