/**
 * lib/storage.ts
 *
 * Semua operasi upload ke Supabase Storage terpusat di sini.
 * Dipakai oleh 3 API routes: cover image, avatar, dan editor image.
 *
 * Setup Supabase Storage yang dibutuhkan:
 *   1. Buka Supabase Dashboard → Storage
 *   2. Buat bucket "uploads" (public: true)
 *   3. Tambah ke .env:
 *        NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=eyJ...  (dari Settings → API → service_role)
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

// ─── Supabase client pakai service_role — hanya di server ────────────────────
// JANGAN expose SUPABASE_SERVICE_ROLE_KEY ke client/browser
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            "NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum di-set di .env"
        );
    }

    return createClient(url, key, {
        auth: { persistSession: false },
    });
}

// ─── Konstanta ────────────────────────────────────────────────────────────────

const BUCKET = "uploads";

const FOLDERS = {
    cover: "covers",   // cover image artikel
    avatar: "avatars",  // foto profil user
    editor: "editor",   // gambar di dalam konten artikel
} as const;

type UploadFolder = keyof typeof FOLDERS;

// Batasan ukuran per kategori (bytes)
const MAX_SIZE: Record<UploadFolder, number> = {
    cover: 5 * 1024 * 1024,  // 5 MB
    avatar: 2 * 1024 * 1024,  // 2 MB
    editor: 8 * 1024 * 1024,  // 8 MB
};

// Tipe file yang diizinkan
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
] as const;

type AllowedType = (typeof ALLOWED_TYPES)[number];

// ─── Helper: generate nama file yang aman ────────────────────────────────────

function generateFilename(originalName: string, userId: string): string {
    const ext = originalName.split(".").pop()?.toLowerCase() ?? "jpg";
    // Pakai random hex — tidak expose userId atau nama asli file
    const random = randomBytes(12).toString("hex");
    const ts = Date.now();
    return `${userId.slice(-8)}_${ts}_${random}.${ext}`;
}

// ─── Validasi file sebelum upload ────────────────────────────────────────────

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export function validateFile(
    file: File,
    folder: UploadFolder
): ValidationResult {
    // Cek tipe
    if (!ALLOWED_TYPES.includes(file.type as AllowedType)) {
        return {
            valid: false,
            error: `Tipe file tidak didukung. Gunakan: JPG, PNG, WebP, atau GIF.`,
        };
    }

    // Cek ukuran
    const maxBytes = MAX_SIZE[folder];
    if (file.size > maxBytes) {
        const maxMB = maxBytes / (1024 * 1024);
        return {
            valid: false,
            error: `Ukuran file terlalu besar. Maksimal ${maxMB} MB untuk ${folder}.`,
        };
    }

    // Cek nama file — hindari path traversal
    if (/[/\\<>:"|?*]/.test(file.name)) {
        return { valid: false, error: "Nama file mengandung karakter tidak valid." };
    }

    return { valid: true };
}

// ─── Upload utama ─────────────────────────────────────────────────────────────

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

export async function uploadImage(
    file: File,
    folder: UploadFolder,
    userId: string
): Promise<UploadResult> {
    // Validasi dulu sebelum menyentuh storage
    const validation = validateFile(file, folder);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    try {
        const supabase = getSupabaseAdmin();
        const filename = generateFilename(file.name, userId);
        const storagePath = `${FOLDERS[folder]}/${filename}`;

        // Convert File ke ArrayBuffer untuk upload
        const buffer = await file.arrayBuffer();

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false, // jangan overwrite — nama sudah random
                cacheControl: "3600", // cache 1 jam di CDN
            });

        if (error) {
            console.error("[Storage] Upload error:", error.message);
            return { success: false, error: "Gagal mengupload file ke storage." };
        }

        // Ambil public URL
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

        return {
            success: true,
            url: data.publicUrl,
            path: storagePath,
        };
    } catch (err) {
        console.error("[Storage] Unexpected error:", err);
        return { success: false, error: "Terjadi kesalahan saat upload." };
    }
}

// ─── Hapus file lama ──────────────────────────────────────────────────────────
// Dipanggil saat user ganti cover/avatar supaya storage tidak penuh

export async function deleteImage(storagePath: string): Promise<void> {
    try {
        const supabase = getSupabaseAdmin();
        await supabase.storage.from(BUCKET).remove([storagePath]);
    } catch (err) {
        // Fire-and-forget — tidak critical kalau gagal hapus
        console.error("[Storage] Delete error:", err);
    }
}

// ─── Extract path dari public URL ────────────────────────────────────────────
// Dipakai untuk mendapatkan storagePath dari URL yang tersimpan di DB
// sebelum menghapus file lama

export function extractStoragePath(publicUrl: string): string | null {
    try {
        const url = new URL(publicUrl);
        // Format: /storage/v1/object/public/uploads/covers/xxx.jpg
        const marker = `/object/public/${BUCKET}/`;
        const idx = url.pathname.indexOf(marker);
        if (idx === -1) return null;
        return url.pathname.slice(idx + marker.length);
    } catch {
        return null;
    }
}