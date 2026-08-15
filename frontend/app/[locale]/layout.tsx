import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

// Импортируем провайдеры
import { AppModeProvider } from '@/components/providers/AppModeProvider';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GoogleAuthWrapper } from '@/components/providers/GoogleAuthWrapper';
import { Providers } from "./providers";
import NotificationListener from "@/components/providers/NotificationListener";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

const BASE_URL = 'https://careyour.pet';

export const metadata: Metadata = {
  title: {
    default: "CareYour.Pet — Pet Health Management Platform",
    template: "%s | CareYour.Pet",
  },
  description:
    "Track vaccinations, medical history, weight, and connect with veterinarians. The all-in-one pet health management platform for pet owners and clinics.",
  keywords: [
    "pet health", "veterinary", "pet medical records", "pet vaccination tracker",
    "dog health", "cat health", "pet passport", "vet clinic software",
    "pet care platform", "CareYourPet",
  ],
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
    languages: {
      en: `${BASE_URL}`,
      ru: `${BASE_URL}?lang=ru`,
    },
  },
  openGraph: {
    title: "CareYour.Pet — Pet Health Management Platform",
    description:
      "Track vaccinations, medical history, weight, and connect with veterinarians. The all-in-one pet health management platform.",
    url: BASE_URL,
    siteName: "CareYour.Pet",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "CareYour.Pet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CareYour.Pet — Pet Health Management Platform",
    description:
      "Track vaccinations, medical history, weight, and connect with veterinarians.",
    images: [`${BASE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CareYour.Pet",
  url: BASE_URL,
  description:
    "Pet health management platform. Track vaccinations, medical history, and connect with veterinarians.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CareYour.Pet",
  url: BASE_URL,
  description:
    "Pet health management platform for owners and veterinary clinics.",
  logo: `${BASE_URL}/logo.png`,
  sameAs: [
    // Add social media links when available
  ],
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.dataset.theme = 'dark';
                } else {
                  document.documentElement.dataset.theme = 'light';
                }
              })();
            `,
          }}
        />
        <meta name="color-scheme" content="light dark" />
        {/* JSON-LD Structured Data for SEO/GEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        {/* Canonical */}
        <link rel="canonical" href={BASE_URL} />
        {/* Hreflang */}
        <link rel="alternate" hrefLang="en" href={BASE_URL} />
        <link rel="alternate" hrefLang="ru" href={`${BASE_URL}?lang=ru`} />
        <link rel="alternate" hrefLang="x-default" href={BASE_URL} />
      </head>
      <body
        className={`${inter.className} bg-background text-foreground min-h-screen`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <AppModeProvider>
              <GoogleAuthWrapper>
                <NotificationListener />
                <Header />
                <main className="flex-grow">{children}</main>
                <Footer />
              </GoogleAuthWrapper>
            </AppModeProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}