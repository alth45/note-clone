"use client";

// hooks/useTheme.ts
// Satu-satunya source of truth untuk tema dark/light.
//
// Priority:
//   1. localStorage ("dark" | "light") — preferensi user yang pernah toggle
//   2. system preference (prefers-color-scheme) — default pertama kali
//
// Cara pakai:
//   const { theme, toggleTheme, isDark } = useTheme();

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "noteos-theme";

// Baca preferensi awal di luar React (tidak trigger re-render)
function getInitialTheme(): Theme {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

// Apply class ke <html> langsung — cepat, tidak perlu re-render
function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === "dark") {
        root.classList.add("dark");
    } else {
        root.classList.remove("dark");
    }
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>("light");

    // Inisialisasi dari localStorage/system saat mount
    useEffect(() => {
        const initial = getInitialTheme();
        setTheme(initial);
        applyTheme(initial);
    }, []);

    // Listen perubahan system preference
    // (kalau user belum pernah manual toggle)
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => {
            // Hanya ikut system kalau user belum pernah set manual
            if (!localStorage.getItem(STORAGE_KEY)) {
                const next: Theme = e.matches ? "dark" : "light";
                setTheme(next);
                applyTheme(next);
            }
        };
        mq.addEventListener("change", handleChange);
        return () => mq.removeEventListener("change", handleChange);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next: Theme = prev === "light" ? "dark" : "light";
            localStorage.setItem(STORAGE_KEY, next);
            applyTheme(next);
            return next;
        });
    }, []);

    const setExplicit = useCallback((t: Theme) => {
        localStorage.setItem(STORAGE_KEY, t);
        applyTheme(t);
        setTheme(t);
    }, []);

    return {
        theme,
        isDark: theme === "dark",
        toggleTheme,
        setTheme: setExplicit,
    };
}