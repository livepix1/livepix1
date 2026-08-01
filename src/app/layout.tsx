import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: `${BRAND.tagline}. Taxa de ${BRAND.fees.pixPercent}% e saque sempre grátis.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${sora.variable} ${inter.variable} font-inter`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
