/**
 * app/api/auth/[...nextauth]/route.ts  — VERSI HARDENED
 *
 * Gantikan file yang sudah ada.
 *
 * Perbaikan vs versi lama:
 *  - Brute force protection: account lock setelah 5x gagal
 *  - Timing-safe: selalu jalankan bcrypt.compare() terlepas dari kondisi
 *  - Session maxAge dikurangi dari default ke 7 hari
 *  - Token harus bcrypt — tolak plaintext lama
 *  - Tidak bocorkan apakah email terdaftar atau tidak
 */

import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";

const MAX_FAILED = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 menit

// Dummy hash untuk timing-safe response kalau user tidak ditemukan
const DUMMY_HASH = "$2b$12$dummyhashfortimingprotectiononly00000000000000000000";

async function recordFailed(userId: string) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { failedLoginCount: { increment: 1 } },
        select: { failedLoginCount: true },
    });

    if (user.failedLoginCount >= MAX_FAILED) {
        await prisma.user.update({
            where: { id: userId },
            data: { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) },
        });
    }
}

async function recordSuccess(userId: string, ip?: string) {
    await prisma.user.update({
        where: { id: userId },
        data: {
            failedLoginCount: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: ip ?? null,
        },
    });
}

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 hari (lebih aman dari default 30 hari)
    },
    pages: { signIn: "/login" },

    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) return null;

                // Batasi panjang sebelum apapun — cegah bcrypt DoS
                if (credentials.password.length > 72) {
                    throw new Error("Email atau password salah.");
                }

                const email = credentials.email.trim().toLowerCase();

                // Rate limit per IP dari header (kalau tersedia)
                const ip = (req as any)?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ?? "unknown";
                const ipRl = rateLimit(`auth:ip:${ip}`, RATE_LIMITS.login);
                if (!ipRl.allowed) {
                    throw new Error(`Terlalu banyak percobaan. Coba lagi dalam ${ipRl.retryAfter} detik.`);
                }

                const user = await prisma.user.findUnique({
                    where: { email },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        handle: true,
                        bio: true,
                        password: true,
                        lockedUntil: true,
                        failedLoginCount: true,
                    },
                });

                const hashToCompare = user?.password ?? DUMMY_HASH;

                // Validasi format hash sebelum compare
                const isBcrypt = hashToCompare.startsWith("$2b$") || hashToCompare.startsWith("$2a$");
                if (!isBcrypt) {
                    await bcrypt.compare(credentials.password, DUMMY_HASH);
                    throw new Error("Akun memerlukan reset password. Login via web dan perbarui password.");
                }

                // Cek lock SETELAH bcrypt format check — agar timing konsisten
                if (user?.lockedUntil && user.lockedUntil > new Date()) {
                    const minsLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
                    await bcrypt.compare(credentials.password, DUMMY_HASH); // timing
                    throw new Error(`Akun dikunci. Coba lagi dalam ${minsLeft} menit.`);
                }

                const isValid = await bcrypt.compare(credentials.password, hashToCompare);

                if (!isValid || !user) {
                    if (user) await recordFailed(user.id);
                    // Pesan yang sama untuk email tidak ditemukan DAN password salah
                    throw new Error("Email atau password salah.");
                }

                await recordSuccess(user.id, ip);

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    handle: user.handle,
                    bio: user.bio,
                };
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.handle = (user as any).handle;
                token.bio = (user as any).bio;
            }
            if (trigger === "update" && session) {
                token.name = session.name;
                token.handle = session.handle;
                token.bio = session.bio;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).id = token.id;
                (session.user as any).handle = token.handle;
                (session.user as any).bio = token.bio;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };