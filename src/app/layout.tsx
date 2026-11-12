import type { Metadata } from "next";
import { Barlow_Condensed, Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { t } from "@/i18n";

// Display: page titles and the big win rate only.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "SOFT"],
  // No metric-adjusted Arial/Times fallback: system fonts only while the web font loads.
  adjustFontFallback: false,
  fallback: ["ui-serif", "Georgia", "serif"],
});
// Stats, tables and the scoreboard (tabular figures via the `stat` utility).
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
// Body text.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin", "latin-ext"],
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: t.app.name, template: `%s · ${t.app.name}` },
  description: t.app.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      suppressHydrationWarning
      className={`${fraunces.variable} ${barlowCondensed.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="hearth-backdrop min-h-full text-parchment">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
