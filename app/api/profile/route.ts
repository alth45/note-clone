import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// ─── Validasi rules ───────────────────────────────────────────────────────────
const HANDLE_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

function validateProfile(name: unknown, handle: unknown, bio: unknown) {
    const errors: string[] = [];

    if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
            errors.push("Nama tidak boleh kosong.");
        } else if (name.trim().length > 100) {
            errors.push("Nama maksimal 100 karakter.");
        }
    }

    if (handle !== undefined && handle !== null && handle !== "") {
        if (typeof handle !== "string") {
            errors.push("Handle tidak valid.");
        } else if (!HANDLE_REGEX.test(handle)) {
            errors.push("Handle hanya boleh huruf, angka, underscore, dan dash. Minimal 3, maksimal 30 karakter.");
        }
    }

    if (bio !== undefined && bio !== null && bio !== "") {
        if (typeof bio !== "string") {
            errors.push("Bio tidak valid.");
        } else if (bio.length > 500) {
            errors.push("Bio maksimal 500 karakter.");
        }
    }

    return errors;
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Akses ditolak. Anda belum login." },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { name, handle, bio } = body;

        // Validasi semua field sebelum menyentuh DB
        const errors = validateProfile(name, handle, bio);
        if (errors.length > 0) {
            return NextResponse.json(
                { message: errors.join(" ") },
                { status: 400 }
            );
        }

        // Sanitasi nilai sebelum masuk DB
        const safeName = typeof name === "string" ? name.trim() : undefined;
        const safeHandle = handle || null;
        const safeBio = typeof bio === "string" ? bio.trim() : null;

        // Validasi handle unik — tidak boleh dipakai user lain
        if (safeHandle) {
            const existingHandle = await prisma.user.findFirst({
                where: {
                    handle: safeHandle,
                    NOT: { email: session.user.email },
                },
                select: { id: true },
            });

            if (existingHandle) {
                return NextResponse.json(
                    { message: "Username/Handle sudah digunakan orang lain." },
                    { status: 400 }
                );
            }
        }

        const updatedUser = await prisma.user.update({
            where: { email: session.user.email },
            data: {
                ...(safeName !== undefined && { name: safeName }),
                handle: safeHandle,
                bio: safeBio,
            },
            select: {
                id: true,
                name: true,
                handle: true,
                bio: true,
                email: true,
                image: true,
            },
        });

        return NextResponse.json(
            { message: "Profil berhasil diperbarui!", user: updatedUser },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error Update Profile:", error);
        return NextResponse.json(
            { message: "Terjadi kesalahan server" },
            { status: 500 }
        );
    }
}