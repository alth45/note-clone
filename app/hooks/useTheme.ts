"use client";

import { useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark";
const KEY = "noteos-theme";

function getInitialTheme(): Theme {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(KEY) as Theme | null;
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme, animate = false) {
    const html = document.documentElement;

    if (animate) {
        // Tambah class transitioning — CSS pakai ini untuk enable transition
        html.classList.add("transitioning");
        setTimeout(() => html.classList.remove("transitioning"), 250);
    }

    if (theme === "dark") {
        html.classList.add("dark");
    } else {
        html.classList.remove("dark");
    }
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const initial = getInitialTheme();
        setTheme(initial);
        applyTheme(initial, false); // tanpa animasi saat pertama load
        setMounted(true);
    }, []);

    // Listen system preference change
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem(KEY)) {
                const next: Theme = e.matches ? "dark" : "light";
                setTheme(next);
                applyTheme(next, false);
            }
        };
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next: Theme = prev === "light" ? "dark" : "light";
            localStorage.setItem(KEY, next);
            applyTheme(next, true); // dengan animasi saat user toggle
            return next;
        });
    }, []);

    return { theme, isDark: theme === "dark", toggleTheme, mounted };
}