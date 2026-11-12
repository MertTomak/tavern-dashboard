import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { MobileNav, Sidebar } from "@/components/layout/Sidebar";
import { FilterBar } from "@/components/layout/FilterBar";
import { tr } from "@/i18n/tr";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: tr.app.name,
  description: tr.app.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Sidebar />
            <MobileNav />
            <div className="flex min-w-0 flex-1 flex-col">
              <Suspense fallback={<div className="h-[73px] border-b border-border" />}>
                <FilterBar />
              </Suspense>
              <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
