import prisma from "@/lib/prisma";
import ReadClient from "./ReadClient";

// 1. Ini Server Component, jadi nggak pake "use client"
export default async function PostDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    // Buka params-nya (Next.js 15 way)
    const { slug } = await params;

    // 2. Tarik data dari PostgreSQL berdasarkan Slug
    const post = await prisma.post.findUnique({
        where: { slug: slug },
        include: { author: true } // Bawa data penulisnya sekalian
    });

    // 3. Kalau datanya nggak ada atau belum di-publish
    if (!post || !post.published) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h1 className="text-4xl font-bold text-sumi mb-4">404</h1>
                <p className="text-sumi-muted">Artikel tidak ditemukan atau belum dipublikasikan.</p>
            </div>
        );
    }

    // 4. Lempar data asli ke Komponen UI (Client)
    return <ReadClient post={post} />;
}