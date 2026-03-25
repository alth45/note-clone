/**
 * lib/rateLimit.ts
 *
 * Rate limiter sliding window, per-user per-route.
 * In-memory untuk development/single instance.
 * Swap ke Upstash Redis untuk multi-instance production.
 *
 * Cara pakai:
 *
 *   import { rateLimit } from "@/lib/rateLimit";
 *
 *   // Di dalam API handler:
 *   const rl = rateLimit(`comment:${userId}`, { max: 10, windowMs: 60_000 });
 *   if (!rl.allowed) return tooManyRequests(rl.retryAfter);
 */

type RLEntry = {
    timestamps: number[]; // sliding window: simpan waktu setiap request
    blockedUntil?: number;
};

const store = new Map<string, RLEntry>();

// Cleanup expired entries setiap 5 menit
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (
            (entry.blockedUntil && now > entry.blockedUntil) ||
            entry.timestamps.every((t) => now - t > 300_000)
        ) {
            store.delete(key);
        }
    }
}, 5 * 60_000);

export interface RateLimitOptions {
    max: number;         // jumlah request maksimal dalam window
    windowMs: number;    // durasi window dalam ms
    blockMs?: number;    // durasi block setelah melampaui limit (default: windowMs)
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfter: number; // detik
    total: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
    const { max, windowMs, blockMs = windowMs } = opts;
    const now = Date.now();

    let entry = store.get(key);

    // Cek apakah sedang dalam block period
    if (entry?.blockedUntil && now < entry.blockedUntil) {
        return {
            allowed: false,
            remaining: 0,
            retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
            total: max,
        };
    }

    if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
    }

    // Sliding window: buang timestamp yang sudah di luar window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

    if (entry.timestamps.length >= max) {
        // Block untuk durasi blockMs
        entry.blockedUntil = now + blockMs;
        return {
            allowed: false,
            remaining: 0,
            retryAfter: Math.ceil(blockMs / 1000),
            total: max,
        };
    }

    // Tambahkan timestamp request ini
    entry.timestamps.push(now);

    return {
        allowed: true,
        remaining: max - entry.timestamps.length,
        retryAfter: 0,
        total: max,
    };
}

// ─── Preset konfigurasi untuk berbagai endpoint ───────────────────────────────

export const RATE_LIMITS = {
    // Autosave editor — frekuensi tinggi, wajar
    autoSave: { max: 30, windowMs: 60_000 },

    // Publish/unpublish — lebih jarang
    publish: { max: 10, windowMs: 60_000 },

    // Komentar — cooldown 5 detik per komentar, max 10 per jam per post
    comment: { max: 10, windowMs: 60 * 60_000, blockMs: 5_000 },

    // Like/bookmark — bisa agak cepat
    interact: { max: 60, windowMs: 60_000 },

    // Search — cukup toleran
    search: { max: 30, windowMs: 60_000 },

    // Follow/unfollow
    follow: { max: 20, windowMs: 60_000 },

    // Upload via CLI
    cliUpload: { max: 20, windowMs: 60_000 },

    // Login attempt — sangat ketat
    login: { max: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 },
} as const;