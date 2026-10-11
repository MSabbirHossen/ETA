import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import {
  I18nProvider,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isSupportedLocale,
  getLocaleDirection,
  type SupportedLocale,
} from "../i18n";
import { ServiceWorkerRegister } from "../components/pwa/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Exploratory Training Academy (ETA) | Learn • Explore • Grow",
  description:
    "Unified Academic, Training & Examination Management Platform. Empowering students, instructors, and academy administrators.",
  keywords: ["ETA", "Exploratory Training Academy", "LMS", "Exam Platform", "Academic Management"],
  authors: [{ name: "ETA Engineering Team" }],
  icons: {
    icon: [
      { url: "/favicons/favicon.ico", sizes: "any" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/favicons/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ETA",
  },
};

export const viewport: Viewport = {
  themeColor: "#073C84",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const initialLocale: SupportedLocale = isSupportedLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const initialDirection = getLocaleDirection(initialLocale);

  return (
    <html
      lang={initialLocale}
      dir={initialDirection}
      className="h-full antialiased dark"
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#060E1A] text-[#F0F6FC]"
      >
        <AuthProvider>
          <I18nProvider initialLocale={initialLocale}>
            <ServiceWorkerRegister />
            {children}
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
