import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",

    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./lib/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
    ],

    theme: {
        extend: {
            colors: {
                // ── Light: kertas putih Jepang ─────────────────────────────
                washi: {
                    DEFAULT: "#ffffff",
                    dark: "#f7f6f2",
                },
                // ── Light: tinta hitam Jepang ──────────────────────────────
                sumi: {
                    DEFAULT: "#1c1c1e",
                    light: "#505054",
                    muted: "#8e8e93",
                    "10": "rgba(28,28,30,0.10)",
                },
            },

            fontFamily: {
                sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
                mono: ["var(--font-geist-mono)", "monospace"],
            },

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