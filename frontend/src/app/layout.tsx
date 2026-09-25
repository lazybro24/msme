import type { Metadata, Viewport } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";
import { ToastProvider } from "@/components/ui/Toast";
import { LOGO_SRC } from "@/lib/logo";

const display = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const sans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

/** Google / social snippet: headline (title) + intro (description) */
const seoDescription = `${site.subtitle}. ${site.description}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: seoDescription,
  applicationName: site.name,
  keywords: [
    "MSME",
    "Mysuru MSME",
    "Mysuru MSME Awards",
    "Mysuru MSME Awards 2026",
    "MSME Awards Mysuru",
    "business awards Mysuru",
    "MSME recognition",
    "nominate MSME",
    site.organizer,
  ],
  authors: [{ name: site.organizer }],
  creator: site.organizer,
  icons: {
    icon: [{ url: LOGO_SRC, type: "image/jpeg", sizes: "any" }],
    shortcut: LOGO_SRC,
    apple: [{ url: LOGO_SRC, type: "image/jpeg" }],
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: seoDescription,
    images: [
      {
        url: LOGO_SRC,
        alt: `${site.name} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: seoDescription,
    images: [LOGO_SRC],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: site.url,
  },
  verification: {
    google: "B0yi6a-x0vSBQN5dElwB6POjkhIoGSzGUR-SoQAxo5w",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  alternateName: ["MSME", "Mysuru MSME Awards", "Mysuru MSME Awards 2026"],
  url: site.url,
  description: seoDescription,
  publisher: {
    "@type": "Organization",
    name: site.organizer,
    logo: {
      "@type": "ImageObject",
      url: `${site.url}${LOGO_SRC}`,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${display.variable} ${sans.variable} font-sans`}
        suppressHydrationWarning
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
