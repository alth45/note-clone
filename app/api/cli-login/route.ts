import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcrypt"; // Sesuaikan: kalau lu pake bcryptjs, ganti jadi "bcryptjs"

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        // 1. Cari user
        const user = await prisma.user.findUnique({
            where: { email: email }
        });

        // Kalau user gak ketemu atau dia gak punya password (misal login via Google)
        if (!user || !user.password) {
            return NextResponse.json({ message: "Email atau Password terminal salah!" }, { status: 401 });
        }

        // 2. --- FITUR BARU: COMPARE HASH ---
        // Kita suruh bcrypt ngebandingin teks mentah dari terminal sama hash di database
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ message: "Email atau Password terminal salah!" }, { status: 401 });
        }

        // 3. Kalau cocok, bikinin token baru
        const newToken = crypto.randomUUID();

        await prisma.user.update({
            where: { id: user.id },
            data: { cliToken: newToken }
        });

        return NextResponse.json({
            message: "Login Berhasil",
            token: newToken,
            username: user.name || "User"
        }, { status: 200 });

    } catch (error) {
        console.error("CLI Login Error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server." }, { status: 500 });
    }
}