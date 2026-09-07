import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthGuard } from "@/components/auth-guard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://neurach.tech"),
  title: "Neurach – AI Private Knowledge Base & Hybrid RAG",
  description: "Build a permanent private knowledge base from your documents. Get cited answers – not hallucinations.",
  keywords: [
    "Neurach",
    "Private AI Knowledge Base",
    "Hybrid RAG",
    "Enterprise AI Assistant",
    "Qdrant Vector DB",
    "Document Search",
    "Self-Hosted RAG",
    "BYOD AI"
  ],
  authors: [{ name: "Stanislav Pepryk", url: "https://linkedin.com/in/peprykstas" }],
  openGraph: {
    title: "Neurach – AI Private Knowledge Base & Hybrid RAG",
    description: "Build a permanent private knowledge base from your documents. Get cited answers – not hallucinations.",
    url: "https://neurach.tech",
    siteName: "Neurach",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neurach – AI Private Knowledge Base & Hybrid RAG",
    description: "Build a permanent private knowledge base from your documents with full privacy and cited answers.",
  },
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Neurach",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://neurach.tech",
  "description": "Private enterprise AI knowledge base and hybrid RAG platform with instant document search, cited answers, and complete data privacy.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Person",
    "name": "Stanislav Pepryk",
    "url": "https://linkedin.com/in/peprykstas"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark text-default" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body className={`${inter.className} bg-background text-foreground antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </LanguageProvider>
        </ThemeProvider>
        <Script
          src="https://scripts.simpleanalyticscdn.com/latest.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}