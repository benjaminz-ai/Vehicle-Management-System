import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";
import { LayoutShell } from "@/components/LayoutShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fleet Manager",
  description: "Fleet vehicle management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" className="h-full">
      <body className={`${inter.className} h-full bg-[#f0f4f8] text-gray-900`}>
        <ClientProviders>
          <LayoutShell>{children}</LayoutShell>
        </ClientProviders>
      </body>
    </html>
  );
}
