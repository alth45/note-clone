"use client";

import Link from "next/link";
import { Search, LogIn, LayoutDashboard, User, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationDropdown from "@/components/ui/NotificationDropdown";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Navbar() {
    const pathname = usePathname();
    const isAuthPage = pathname === "/login";

    const { data: session } = useSession();
    const user = session?.user as any;
    const handle = user?.handle;

    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    const { unreadCount } = useNotifications(!!session && !notifOpen);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <header className="sticky top-0 z-50 bg-washi/80 backdrop-blur-md border-b border-sumi/10">
            <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">

                <Link href="/" className="font-bold text-xl tracking-tight text-sumi">
                    ロゴ <span className="font-light text-sumi-muted">/ LOGO</span>
                </Link>

                <div className="flex items-center gap-1 md:gap-2">

                    {/* Search trigger */}
                    <button className="flex items-center gap-2 text-sumi-muted hover:text-sumi transition-colors px-2 py-1.5 rounded-lg hover:bg-sumi/5">
                        <Search size={18} />
                        <span className="text-xs font-medium border border-sumi/10 bg-washi-dark px-1.5 py-0.5 rounded text-sumi-muted/70 hidden sm:block">
                            Ctrl + K
                        </span>
                    </button>

                    {/* ── Theme toggle — selalu tampil ── */}
                    <ThemeToggle />

                    {user ? (
                        <div className="flex items-center gap-1">

                            {/* Bell */}
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={() => {
                                        setNotifOpen((v) => !v);
                                        setProfileOpen(false);
                                    }}
                                    className="relative p-2 rounded-full text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors"
                                    title="Notifikasi"
                                    aria-label={`${unreadCount} notifikasi belum dibaca`}
                                >
                                    <Bell size={18} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none tabular-nums">
                                            {unreadCount > 99 ? "99+" : unreadCount}
                                        </span>
                                    )}
                                </button>

                                <NotificationDropdown
                                    isOpen={notifOpen}
                                    onClose={() => setNotifOpen(false)}
                                />
                            </div>

                            {/* Avatar + profile dropdown */}
                            <div className="relative ml-1" ref={profileRef}>
                                <button
                                    onClick={() => {
                                        setProfileOpen((v) => !v);
                                        setNotifOpen(false);
                                    }}
                                    className="w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-sumi/30 transition-all duration-300 focus:outline-none"
                                    title="Menu profil"
                                >
                                    <img
                                        src={
                                            user.image ||
                                            `https://ui-avatars.com/api/?name=${user.name}&background=1c1c1e&color=f4f4f5`
                                        }
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                </button>

                                {profileOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-washi border border-sumi/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden z-[60] animate-in">
                                        <div className="px-4 py-3 border-b border-sumi/10">
                                            <p className="text-sm font-bold text-sumi truncate">
                                                {user.name || "User"}
                                            </p>
                                            <p className="text-xs text-sumi-muted truncate">
                                                {handle ? `@${handle}` : user.email}
                                            </p>
                                        </div>
                                        <div className="py-1.5">
                                            {handle && (
                                                <Link
                                                    href={`/u/${handle}`}
                                                    onClick={() => setProfileOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors"
                                                >
                                                    <User size={15} /> Profil Publik
                                                </Link>
                                            )}
                                            <Link
                                                href="/dashboard"
                                                onClick={() => setProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors"
                                            >
                                                <LayoutDashboard size={15} /> Dashboard
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        !isAuthPage && (
                            <Link
                                href="/login"
                                className="ml-1 flex items-center gap-2 text-sm font-medium bg-sumi text-washi px-4 md:px-5 py-2 md:py-2.5 rounded-full hover:bg-sumi-light hover:-translate-y-0.5 transition-all duration-300"
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