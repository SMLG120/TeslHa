import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Michroma } from "next/font/google";
import { SiteNav } from "@/components/layout/site-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const michroma = Michroma({ variable: "--font-michroma", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "TeslHa — Engineering the Electric Future", template: "%s · TeslHa" },
  description:
    "An interactive 3D electric-vehicle showroom, engineering lab and performance analytics platform exploring Model S, 3, X, Y and Roadster. Independent project, not affiliated with Tesla.",
  applicationName: "TeslHa",
  openGraph: { title: "TeslHa — Engineering the Electric Future", type: "website" },
};

export const viewport: Viewport = { themeColor: "#050506", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteNav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
