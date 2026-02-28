import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

/**
 * @route   POST /api/posts
 * @desc    Membuat draf artikel baru kosong. Mendukung pembuatan di dalam folder spesifik.
 * @access  Private (Hanya user yang login)
 */
export async function POST(req: Request) {
    try {
        // 1. Validasi Autentikasi: Pastikan user sudah masuk/login
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Akses ditolak. Silakan login." }, { status: 401 });
        }

        // 2. Tangkap Payload: Ambil data dari klien (opsional). Fallback ke objek kosong jika tidak ada body.
        const body = await req.json().catch(() => ({}));
        const { folderId, title } = body;

        // 3. Generate Identifier: Buat slug sementara yang unik menggunakan timestamp waktu
        const uniqueSlug = `draft-${Date.now()}`;

        // 4. Siapkan Kerangka Data: Rakit data dasar untuk di-insert ke database
        const postData: any = {
            title: title || "Tanpa Judul", // Gunakan judul bawaan jika klien tidak mengirimkan judul
            slug: uniqueSlug,
            content: {},                   // Konten JSON kosong untuk inisialisasi Tiptap Editor
            published: false,              // Default status selalu Draf
            author: {
                connect: { email: session.user.email } // Relasikan artikel ini ke akun user yang sedang login
            }
        };

        // 5. Penempatan Folder (Opsional): Jika klien mengirim folderId, hubungkan artikel ke folder tersebut
        if (folderId) {
            postData.folder = {
                connect: { id: folderId }
            };
        }

        // 6. Eksekusi Database: Simpan artikel baru ke PostgreSQL menggunakan Prisma
        const newPost = await prisma.post.create({
            data: postData
        });

        // 7. Berikan Respons: Kembalikan data artikel yang baru dibuat ke klien
        return NextResponse.json(newPost, { status: 201 });

    } catch (error) {
        console.error("Error bikin draft:", error);
        return NextResponse.json({ message: "Gagal membuat draft baru" }, { status: 500 });
    }
}

/**
 * @route   GET /api/posts
 * @desc    Mengambil semua riwayat artikel (Draf & Telah Terbit) milik user secara lengkap.
 * @access  Private
 */
export async function GET(req: Request) {
    try {
        // 1. Validasi Autentikasi
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Akses ditolak. Silakan login." }, { status: 401 });
        }

        // 2. Eksekusi Database: Tarik semua artikel milik user ini.
        // Catatan: Sengaja tidak menggunakan 'select' agar seluruh kolom (views, likesCount, createdAt) 
        // terbawa semua, yang mana sangat dibutuhkan oleh halaman Dashboard.
        const posts = await prisma.post.findMany({
            where: {
                author: { email: session.user.email }
            },
            orderBy: {
                updatedAt: 'desc' // Urutkan dari yang paling baru di-edit/diperbarui
            }
        });

        // 3. Berikan Respons: Kirimkan array artikel ke klien
        return NextResponse.json(posts, { status: 200 });

    } catch (error) {
        console.error("Error fetch posts:", error);
        return NextResponse.json({ message: "Gagal mengambil data" }, { status: 500 });
    }
}