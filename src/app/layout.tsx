import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { SettingsProvider } from "@/context/SettingsContext";
import GlobalSettingsModalWrapper from "@/components/GlobalSettingsModalWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ポモドーロタイマー",
  description: "Supabaseと連携したシンプルなポモドーロタイマーです。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>)
{
  return (
    <html lang="ja">
      <body className={inter.className}>
        <SettingsProvider>
          <Navbar />
          <div className="pt-16"> {/* Add padding-top to prevent content from being hidden behind the fixed Navbar */}
            {children}
          </div>
          <GlobalSettingsModalWrapper />
        </SettingsProvider>
      </body>
    </html>
  );
}
