import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { siteConfig } from "@/shared/config/site";
import { THEME_BOOT_SCRIPT } from "@/shared/config/theme";
import { InlineScript } from "@/shared/ui/inline-script";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The boot script sets data-theme on <html> before React hydrates.
    <html lang="en" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <InlineScript html={THEME_BOOT_SCRIPT} />
        {children}
      </body>
    </html>
  );
}
