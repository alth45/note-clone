/**
 * app/api/upload/route.ts
 *
 * Satu endpoint untuk semua upload gambar.
 * Pakai query param ?type=cover|avatar|editor
 *
 * Request: multipart/form-data
 *   - file: File
 *   - (opsional) oldUrl: string — URL lama untuk dihapus dari storage
 *
 * Response:
 *   { url: string }  — public URL file yang baru diupload
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {
    uploadImage,
    deleteImage,
    extractStoragePath,
    validateFile,
} from "@/lib/storage";
import prisma from "@/lib/prisma";

// Rate limit sederhana: max 20 upload per 10 menit per user
const uploadLog = new Map<string, number[]>();

function checkUploadRateLimit(userId: string): boolean {
    const now = Date.now();
    const window = 10 * 60_000; // 10 menit
    const max = 20;

    const timestamps = (uploadLog.get(userId) ?? []).filter(
        (t) => now - t < window
    );

    if (timestamps.length >= max) return false;

    timestamps.push(now);
    uploadLog.set(userId, timestamps);
    return true;
}

export async function POST(req: Request) {
    try {
        // 1. Auth
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        // 2. Rate limit
        if (!checkUploadRateLimit(user.id)) {
            return NextResponse.json(
                { message: "Terlalu banyak upload. Coba lagi dalam beberapa menit." },
                { status: 429 }
            );
        }

        // 3. Baca query param type
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");

        if (!type || !["cover", "avatar", "editor"].includes(type)) {
            return NextResponse.json(
                { message: "Query param ?type= harus cover, avatar, atau editor." },
                { status: 400 }
            );
        }

        const uploadType = type as "cover" | "avatar" | "editor";

        // 4. Parse multipart form
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch {
            return NextResponse.json({ message: "Form data tidak valid." }, { status: 400 });
        }

        const file = formData.get("file");
        const oldUrl = formData.get("oldUrl");

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ message: "File tidak ditemukan di request." }, { status: 400 });
        }

        // 5. Validasi file sebelum upload
        const validation = validateFile(file, uploadType);
        if (!validation.valid) {
            return NextResponse.json({ message: validation.error }, { status: 400 });
        }

        // 6. Upload file baru
        const result = await uploadImage(file, uploadType, user.id);

        if (!result.success || !result.url) {
            return NextResponse.json(
                { message: result.error ?? "Upload gagal." },
                { status: 500 }
            );
        }

        // 7. Hapus file lama dari storage (fire-and-forget)
        if (oldUrl && typeof oldUrl === "string") {
            const oldPath = extractStoragePath(oldUrl);
            if (oldPath) {
                void deleteImage(oldPath);
            }
        }

        // 8. Kalau avatar, update langsung di DB
        if (uploadType === "avatar") {
            await prisma.user.update({
                where: { id: user.id },
                data: { image: result.url },
            });
        }

        return NextResponse.json({ url: result.url }, { status: 200 });

    } catch (error) {
        console.error("[POST /api/upload]", error);
        return NextResponse.json(
            { message: "Terjadi kesalahan server." },
            { status: 500 }
        );
    }
}