import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const TOKEN_TTL_DAYS = 30;

function generateCliToken(): string {
    return `ntc_${randomBytes(32).toString("hex")}`;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        // Validasi input dasar
        if (!email || typeof email !== "string" || !email.trim()) {
            return NextResponse.json(
                { message: "Email wajib diisi." },
                { status: 400 }
            );
        }

        if (!password || typeof password !== "string") {
            return NextResponse.json(
                { message: "Password wajib diisi." },
                { status: 400 }
            );
        }

        // Batasi panjang input — cegah bcrypt DoS
        // bcrypt hanya memproses 72 karakter pertama, input lebih panjang
        // dari itu tidak menambah keamanan tapi bisa dijadikan attack vector
        if (password.length > 72) {
            return NextResponse.json(
                { message: "Email atau password salah." },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            select: {
                id: true,
                name: true,
                handle: true,
                password: true,
            },
        });

        // Selalu jalankan bcrypt meskipun user tidak ditemukan —
        // cegah timing attack yang bisa dipakai untuk enumerate email valid
        const dummyHash = "$2b$12$invalidhashfortimingprotectiononly000000000000000000000";
        const hashToCompare = user?.password ?? dummyHash;

        // Tolak akun yang passwordnya bukan bcrypt — kemungkinan data lama
        // yang belum di-hash. Paksa reset password daripada terima plain text.
        const isBcrypt =
            hashToCompare.startsWith("$2b$") ||
            hashToCompare.startsWith("$2a$");

        if (!isBcrypt) {
            // Tetap jalankan compare dummy supaya timing-nya konsisten
            await bcrypt.compare(password, dummyHash);
            return NextResponse.json(
                {
                    message:
                        "Akun ini memerlukan reset password. Silakan login via web dan perbarui password Anda.",
                    requiresPasswordReset: true,
                },
                { status: 401 }
            );
        }

        const valid = await bcrypt.compare(password, hashToCompare);

        // Satu pesan error untuk semua kasus gagal —
        // jangan bocorkan apakah email terdaftar atau tidak
        if (!valid || !user) {
            return NextResponse.json(
                { message: "Email atau password salah." },
                { status: 401 }
            );
        }

        // Generate token baru + expiry 30 hari
        const token = generateCliToken();
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + TOKEN_TTL_DAYS);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                cliToken: token,
                cliTokenExpiry: expiry,
            },
        });

        return NextResponse.json({
            token,
            expiresAt: expiry.toISOString(),
            username: user.handle ?? user.name ?? email.split("@")[0],
        });

    } catch (error) {
        console.error("[POST /api/cli-login]", error);
        return NextResponse.json(
            { message: "Server error." },
            { status: 500 }
        );
    }
}