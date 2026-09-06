import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthGuard } from "@/components/auth-guard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Neurach – AI Private Knowledge Base & Hybrid RAG",
  description: "Build a permanent private knowledge base from your documents. Get cited answers – not hallucinations.",
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

import { LanguageProvider } from "@/lib/i18n/LanguageContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark text-default" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased`} suppressHydrationWarning>
        <LanguageProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </LanguageProvider>
        <Script
          src="https://scripts.simpleanalyticscdn.com/latest.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}