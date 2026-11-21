import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://synthia-bio.vercel.app";

export const viewport: Viewport = {
  themeColor: "#0B0F17",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SynthiaBio: Autonomous De Novo Peptide Designer & 3D Studio",
    template: "%s | SynthiaBio",
  },
  description:
    "AI-powered antimicrobial peptide design against WHO priority superbugs with real-time 3D molecular visualization and biophysical validation for the STEM2Connect Hackathon 2026.",
  applicationName: "SynthiaBio",
  authors: [{ name: "SynthiaBio Engineering Team" }],
  generator: "Next.js 16",
  keywords: [
    "Antimicrobial Peptides",
    "AMP Designer",
    "De Novo Protein Design",
    "In-Silico Drug Discovery",
    "Antimicrobial Resistance",
    "AMR WHO Superbugs",
    "3D Molecule Studio",
    "WebGL 3Dmol",
    "STEM2Connect Hackathon",
    "Bioinformatics AI",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "SynthiaBio",
    title: "SynthiaBio: Autonomous De Novo Peptide Designer & 3D Studio",
    description:
      "Tackling the WHO Critical Antimicrobial Resistance (AMR) Crisis with In-Silico Generative Drug Discovery and Real-Time 3D Molecular Simulation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SynthiaBio: Autonomous De Novo Peptide Designer & 3D Studio",
    description:
      "Generative AI peptide engineering against WHO superbugs with real-time 3D WebGL molecular simulation.",
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SynthiaBio",
  "applicationCategory": "HealthApplication, DeveloperApplication",
  "operatingSystem": "Web Browser",
  "description":
    "Autonomous generative AI antimicrobial peptide designer and real-time 3D molecular studio for biophysical simulation against WHO priority superbugs.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  },
  "author": {
    "@type": "Organization",
    "name": "SynthiaBio Team",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-ground text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
