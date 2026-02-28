import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Import Navbar baru kita
import Navbar from "@/components/layout/Navbar";
import CommandPalette from "@/components/ui/CommandPalette";
// import { AuthProvider } from "@/context/AuthContext";
import { DialogProvider } from "@/context/DialogContext"; // IMPORT INI BRO
// import NextAuth from "next-auth";
import { NextAuthProvider } from "@/context/NextAuthProvider";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "MediaKu - Baca & Tulis Sesukamu",
  description: "Platform berbagi media dan catatan minimalis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-washi text-sumi antialiased min-h-screen flex flex-col`}>


        <NextAuthProvider>
          <DialogProvider>
            <CommandPalette />

            {/* Panggil Navbar di sini */}
            <Navbar />

            {/* Konten Utama */}
            <main className="flex-grow max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-12 py-8 md:py-12">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-sumi-10 py-8 mt-auto">
              <div className="max-w-[1440px] mx-auto px-6 lg:px-12 text-center text-sm text-sumi-muted">
                © {new Date().getFullYear()} Platform Catatan. Desain terinspirasi dari minimalisme Jepang.
              </div>
            </footer>
          </DialogProvider>
        </NextAuthProvider>

      </body>
    </html>
  );
}