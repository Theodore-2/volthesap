import type { Metadata } from "next";
import { Manrope, DM_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VoltHesap — Elektrikli araç maliyet hesabı",
    template: "%s · VoltHesap",
  },
  description: "Elektrikli aracının gerçek şarj maliyetini, tüketimini ve faturadaki birim fiyatını hesapla.",
  applicationName: "VoltHesap",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: "VoltHesap",
    title: "VoltHesap — Şarjdan önce hesabını bil",
    description: "Elektrikli aracının gerçek şarj maliyetini, tüketimini ve yakıtlı araca göre farkını hesapla.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "VoltHesap" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VoltHesap — Şarjdan önce hesabını bil",
    description: "Elektrikli aracının gerçek şarj maliyetini ve yakıtlı araca göre farkını hesapla.",
    images: ["/twitter-image.png"],
  },
  verification: {
    google: "B4RM7H_DZhOnQIO9R0vFT90SlotDLwvmBSPeiOfxD3A",
  },
};

const manrope = Manrope({
  variable: "--font-manrope",
  display: "swap",
  subsets: ["latin"],
});

const dmMono = DM_Mono({ variable: "--font-dm-mono", display: "swap", weight: ["400", "500"], subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${manrope.variable} ${dmMono.variable}`}>{children}</body>
    </html>
  );
}
