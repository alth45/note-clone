import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password } = body;

        // 1. Validasi input kosong
        if (!name || !email || !password) {
            return NextResponse.json({ message: "Semua kolom wajib diisi" }, { status: 400 });
        }

        // 2. Cek apakah email udah dipakai orang lain
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ message: "Email sudah terdaftar!" }, { status: 409 });
        }

        // 3. Enkripsi (Hash) Password biar aman masuk DB
        const hashedPassword = await bcryptjs.hash(password, 12);

        // 4. Simpan User ke Database
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                // Kasih avatar default estetik 
                image: `https://ui-avatars.com/api/?name=${name}&background=1c1c1e&color=f4f4f5`,
            },
        });

        return NextResponse.json(
            { message: "Akun berhasil dibuat!", user: { email: newUser.email } },
            { status: 201 }
        );

    } catch (error) {
        console.error("Error Registrasi:", error);
        return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
    }
}