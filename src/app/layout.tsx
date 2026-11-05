import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });

export const metadata: Metadata = {
  title: { default: "Souffleur — copilote d'entretien open source", template: "%s · Souffleur" },
  description:
    "Transcription en direct, réponses suggérées à partir de votre CV, CV ATS, lettres de motivation et suivi de candidatures. Open source, auto-hébergé, vos données restent chez vous.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
