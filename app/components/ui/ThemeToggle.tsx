"use client";

import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
    const { isDark, toggleTheme, mounted } = useTheme();

    // Sebelum mount, render placeholder dengan ukuran sama supaya tidak layout shift
    if (!mounted) {
        return <div className="w-9 h-9" />;
    }

    return (
        <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#8e8e93] hover:text-[#1c1c1e] hover:bg-black/5 dark:text-[#6e6e76] dark:hover:text-[#f2f2f5] dark:hover:bg-white/5 transition-colors"
            title={isDark ? "Mode terang" : "Mode gelap"}
            aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
        >
            {isDark ? (
                // Sun icon
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <line x1="12" y1="2" x2="12" y2="5" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
                    <line x1="2" y1="12" x2="5" y2="12" />
                    <line x1="19" y1="12" x2="22" y2="12" />
                    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
                    <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
                </svg>
            ) : (
                // Moon icon
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            )}
        </button>
    );
}