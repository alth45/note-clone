import type { Config } from "tailwindcss";

const config: Config = {
    // Aktifkan class-based dark mode — class="dark" di <html>
    darkMode: "class",

    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./lib/**/*.{js,ts,jsx,tsx}",
    ],

    theme: {
        extend: {
            colors: {
                // ── Washi (background) ──────────────────────────────────────
                // bg-washi, bg-washi-dark, text-washi, border-washi, dll
                washi: {
                    DEFAULT: "rgb(var(--washi) / <alpha-value>)",
                    dark: "rgb(var(--washi-dark) / <alpha-value>)",
                },

                // ── Sumi (teks & border) ────────────────────────────────────
                // text-sumi, text-sumi-light, text-sumi-muted
                // bg-sumi, border-sumi, border-sumi-10
                sumi: {
                    DEFAULT: "rgb(var(--sumi) / <alpha-value>)",
                    light: "rgb(var(--sumi-light) / <alpha-value>)",
                    muted: "rgb(var(--sumi-muted) / <alpha-value>)",
                    // border-sumi-10 = rgb(sumi / 10%)
                    // Tailwind handles opacity via slash notation otomatis
                    // tapi kita juga bisa pakai: border-sumi/10
                    "10": "rgb(var(--sumi-10) / 0.10)",
                },
            },

            // ── Font ─────────────────────────────────────────────────────────
            fontFamily: {
                sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
                mono: ["var(--font-geist-mono)", "monospace"],
            },

            // ── Animation ────────────────────────────────────────────────────
            keyframes: {
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                "zoom-in-95": {
                    from: { opacity: "0", transform: "scale(0.95)" },
                    to: { opacity: "1", transform: "scale(1)" },
                },
            },
            animation: {
                "in": "fade-in 150ms ease, zoom-in-95 150ms ease",
            },
        },
    },

    plugins: [],
};

export default config;