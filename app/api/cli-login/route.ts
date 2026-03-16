import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto"; // Bawaan Node.js buat bikin token acak

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        // 1. Cari user berdasarkan email
        const user = await prisma.user.findUnique({
            where: { email: email }
        });

        // 2. Cek apakah user ada dan password-nya cocok sama yang di Database
        // (Catatan: Kalau buat production beneran, password ini harus di-hash pakai bcrypt ya bro)
        if (!user || user.password !== password) {
            return NextResponse.json({ message: "Email atau Password terminal salah!" }, { status: 401 });
        }

        // 3. Bikin Token Unik (Personal Access Token) buat user ini
        const newToken = crypto.randomUUID();

        // 4. Simpan token itu ke database user
        await prisma.user.update({
            where: { id: user.id },
            data: { cliToken: newToken }
        });

        // 5. Kirim tokennya ke CLI Terminal mereka
        return NextResponse.json({
            message: "Login Berhasil",
            token: newToken,
            username: user.name || "User"
        }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ message: "Terjadi kesalahan server." }, { status: 500 });
    }
}