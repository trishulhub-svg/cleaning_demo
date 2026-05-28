import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSetting } from "@/lib/settings";
import "./globals.css";

// Force dynamic rendering — app uses auth + DB on most pages
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GreenLeaf Cleaning Services",
  description:
    "Professional eco-friendly cleaning services for your home and office. Trusted by thousands across London.",
  keywords: [
    "cleaning services",
    "eco-friendly cleaning",
    "house cleaning",
    "office cleaning",
    "London cleaning",
    "deep cleaning",
    "end of tenancy cleaning",
    "GreenLeaf",
  ],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch public settings server-side and pass to client components
  const [
    companyName,
    companyEmail,
    companyPhone,
    companyAddress,
    whatsappNumber,
  ] = await Promise.all([
    getSetting("company_name", "GreenLeaf Cleaning"),
    getSetting("company_email", "hello@greenleafcleaning.co.uk"),
    getSetting("company_phone", "07700 000 000"),
    getSetting("company_address", "123 Green Lane, London, EC1A 1BB"),
    getSetting("whatsapp_number", "447700000000"),
  ]);

  const siteSettings = {
    companyName,
    companyEmail,
    companyPhone,
    companyAddress,
    whatsappNumber,
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
      >
        <Providers>
          <div className="min-h-screen flex flex-col">
            <SiteHeader settings={siteSettings} />
            <main className="flex-1">{children}</main>
            <SiteFooter settings={siteSettings} />
          </div>
        </Providers>
      </body>
    </html>
  );
}
