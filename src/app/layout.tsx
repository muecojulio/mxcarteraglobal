import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AmbientBackground from "@/components/AmbientBackground";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import ThemeProvider from "@/components/ThemeProvider";
import AppLock from "@/components/AppLock";
import PersistRoute from "@/components/PersistRoute";
import { SecurityOnboarding } from "@/components/SecurityOnboarding";
import LegalBanner from "@/components/LegalBanner";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: {
    default: "MX Cartera Global",
    template: "%s · MX Cartera Global",
  },
  description:
    "Seguimiento de mercados financieros — México, EE.UU. y mundiales",
  applicationName: "MX Cartera Global",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MX Cartera Global",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f3f8" },
    { media: "(prefers-color-scheme: dark)", color: "#141820" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // La CSP de producción lleva un nonce por petición (ver `src/proxy.ts`), así
  // que los scripts inline necesitan el valor de esta petición: eso obliga a
  // renderizar en el servidor. `connection()` lo deja explícito, porque el
  // nonce se pierde si Next intenta prerenderizar la página.
  await connection();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="es"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="MX Cartera Global" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('marketpulse_theme');var d=document.documentElement;d.classList.remove('light','dark');if(t==='light')d.classList.add('light');else if(t==='dark')d.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <ToastProvider>
          <AppLock>
          <ServiceWorkerRegister />
          <PersistRoute />
          <AmbientBackground />
          <div className="relative z-10 flex-1 flex flex-col pb-28 safe-bottom app-main">
            {children}
          </div>
          <BottomNav />
          <InstallPrompt />
          <SecurityOnboarding />
          <LegalBanner />
        </AppLock>
          </ToastProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
