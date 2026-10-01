import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Nkabom — Ghana's trust & safety network",
  description:
    "Check if a message, offer, or Mobile Money number is a scam. Nkabom protects Ghanaians from fraud with AI, in your own language.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <div className="kente-band h-2 w-full" />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
