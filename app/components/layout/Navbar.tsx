"use client";

import Link from "next/link";
import { Search, LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react"; // 1. IMPORT INI BRO

export default function Navbar() {
    const pathname = usePathname();
    const isAuthPage = pathname === "/login";

    // 2. AMBIL DATA SESSION DARI NEXTAUTH
    const { data: session } = useSession();
    const user = session?.user; // Ekstrak user-nya biar gampang dipanggil

    return (
        <header className="sticky top-0 z-50 bg-washi/80 backdrop-blur-md border-b border-sumi-10">
            <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">

                <Link href="/" className="font-bold text-xl tracking-tight">
                    ロゴ <span className="font-light text-sumi-muted">/ LOGO</span>
                </Link>

                <div className="flex items-center gap-4 md:gap-6">
                    <button className="flex items-center gap-2 text-sumi-muted hover:text-sumi transition-colors px-2 py-1 rounded-md hover:bg-sumi/5">
                        <Search size={18} />
                        <span className="text-xs font-medium border border-sumi-10 bg-washi-dark px-1.5 py-0.5 rounded text-sumi-muted/70 hidden sm:block">
                            Ctrl + K
                        </span>
                    </button>

                    {/* LOGIKA DINAMIS NAVBAR */}
                    {user ? (
                        // KALAU SUDAH LOGIN: Tampilkan Avatar Profile
                        <Link
                            href="/dashboard"
                            className="w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-sumi transition-all duration-300"
                            title="Ke Dashboard"
                        >
                            {/* 3. UBAH user.avatar JADI user.image (Sesuai database Prisma kita) */}
                            <img
                                src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=1c1c1e&color=f4f4f5`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </Link>
                    ) : (
                        // KALAU BELUM LOGIN: Tampilkan Tombol Sign In (Kecuali di halaman login)
                        !isAuthPage && (
                            <Link
                                href="/login"
                                className="flex items-center gap-2 text-sm font-medium bg-sumi text-washi px-4 md:px-5 py-2 md:py-2.5 rounded-full hover:bg-sumi-light hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                            >
                                <LogIn size={16} />
                                <span className="hidden sm:inline">Sign In</span>
                            </Link>
                        )
                    )}

                </div>
            </div>
        </header>
    );
}