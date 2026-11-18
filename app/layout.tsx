import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Atlas Mundi", template: "%s · Atlas Mundi" },
  description:
    "Mapa-múndi interativo com dados, curiosidades e manchetes de cada país. Geopolítica, história, economia e atualidades em um só lugar.",
  openGraph: {
    siteName: "Atlas Mundi",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#070d1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `
(function(){try{var s=localStorage.getItem('atlas-mundi');var t=s?JSON.parse(s).state.theme:null;document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" className={`${fraunces.variable} ${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        {/* aplica o tema salvo antes da pintura, evitando piscar */}
        <Script id="atlas-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
