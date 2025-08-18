import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { SettingsProvider } from "@/context/SettingsContext";
import { TimerProvider } from "@/context/TimerContext";
import { TaskProvider } from "@/context/TaskContext";
import ClientGlobalSettingsModalWrapper from "@/components/ClientGlobalSettingsModalWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ポモドーロタイマー",
  description: "Supabaseと連携したシンプルなポモドーロタイマーです。",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#FF6347",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>)
{
  return (
    <html lang="ja">
      <body className={inter.className}>
        <SettingsProvider>
          <TimerProvider>
            <TaskProvider>
              <Navbar />
              <div className="pt-16"> {/* Add padding-top to prevent content from being hidden behind the fixed Navbar */}
                {children}
              </div>
              <ClientGlobalSettingsModalWrapper />
            </TaskProvider>
          </TimerProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
