import type { Metadata, Viewport } from "next";
import "./globals.css";
import LiffProvider from "@/components/LiffProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "SOS Thailand - แจ้งเหตุฉุกเฉิน",
  description:
    "ระบบแจ้งเหตุฉุกเฉินอัจฉริยะ สำหรับศูนย์กู้ชีพประเทศไทย – กดปุ่มเดียว พูดอธิบาย ส่ง GPS อัตโนมัติ",
  manifest: "/manifest.json",
  icons: [{ rel: "icon", url: "/icons/icon-192.png" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SOS Thailand",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="font-display antialiased bg-bg-main text-white selection:bg-primary/20">
        <ErrorBoundary>
          <LiffProvider>
            {children}
          </LiffProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
