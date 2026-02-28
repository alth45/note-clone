"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Hash, BookOpen, FileText, Columns, Monitor } from "lucide-react";
import ReadingProgress from "@/components/ui/ReadingProgress";
import FloatingActionBar from "@/components/ui/FloatingActionBar";

type ReadMode = 'default' | 'journal' | 'pdf' | 'zen';

// Terima props 'post' dari Server Component (page.tsx)
export default function ReadClient({ post }: { post: any }) {
    const [mode, setMode] = useState<ReadMode>('default');

    // --- PENGOLAHAN DATA DATABASE ---
    // 1. Prisma nyimpen konten Tiptap lu dalam bentuk JSON, kita pastiin dia jadi String HTML
    const htmlContent = typeof post.content === 'string'
        ? post.content
        : (post.content?.html || "");

    // 2. Format Tanggal otomatis
    const formattedDate = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date(post.updatedAt));

    // 3. Hitung otomatis estimasi waktu baca (Anggap rata-rata orang baca 200 kata per menit)
    const wordCount = htmlContent.replace(/<[^>]*>?/gm, '').split(/\s+/).length;
    const readTime = `${Math.ceil(wordCount / 200)} min read`;

    // 4. Fallback Cover Image
    const coverImage = post.coverImage || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop";

    // (Karena kita belum bikin tabel relasi Tags, kita kasih teks statis elegan dulu)
    const tags = ["Eksplorasi", "Catatan"];


    // --- LOGIKA STYLING BERDASARKAN MODE BACA ---
    let containerStyle = "mx-auto pb-20 transition-all duration-700 ease-in-out ";
    let proseStyle = "prose max-w-none transition-all duration-700 ease-in-out ";

    switch (mode) {
        case 'default':
            containerStyle += "max-w-3xl";
            proseStyle += "prose-lg prose-sumi prose-p:text-sumi-light prose-p:leading-relaxed font-sans";
            break;
        case 'journal':
            containerStyle += "max-w-4xl bg-[#F8F5F0] p-10 md:p-16 shadow-[0_0_40px_rgba(0,0,0,0.05)] border-t-[12px] border-sumi rounded-b-xl";
            proseStyle += "prose-xl prose-sumi font-serif prose-p:text-sumi prose-p:leading-loose prose-p:text-justify prose-blockquote:border-sumi/20";
            break;
        case 'pdf':
            containerStyle += "max-w-6xl";
            proseStyle += "prose-base prose-sumi md:columns-2 md:gap-16 prose-p:break-inside-avoid-column prose-h3:break-after-avoid-column prose-img:break-inside-avoid-column font-sans prose-p:text-justify";
            break;
        case 'zen':
            containerStyle += "max-w-2xl bg-sumi p-10 md:p-16 rounded-3xl !text-washi";
            proseStyle += "prose-lg prose-invert prose-p:text-washi/80 prose-h3:text-washi font-sans";
            break;
    }

    return (
        <>
            <ReadingProgress />

            {/* Floating Action Bar (Disembunyikan saat Zen Mode biar fokus 100%) */}
            {mode !== 'zen' && <FloatingActionBar postId={post.id}
                initialLikes={post.likesCount}
                hasLiked={false} // (Opsional: lu bisa cek status like/bookmark user saat ini di server)
            />}

            {/* Kontainer Utama Artikel */}
            <article className={containerStyle}>

                {/* Navigasi Atas & Panel Mode Baca */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pt-4">

                    <Link href="/" className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${mode === 'zen' ? 'text-washi/50 hover:text-washi' : 'text-sumi-muted hover:text-sumi'}`}>
                        <ArrowLeft size={16} /> Kembali
                    </Link>

                    {/* --- PANEL PENGATUR MODE BACA --- */}
                    <div className={`flex items-center gap-1 p-1 rounded-full border backdrop-blur-md ${mode === 'zen' ? 'border-washi/10 bg-sumi-light/50' : 'border-sumi-10 bg-washi/80'}`}>
                        <button onClick={() => setMode('default')} title="Mode Standar" className={`p-2 rounded-full transition-all ${mode === 'default' ? 'bg-sumi text-washi shadow-md' : (mode === 'zen' ? 'text-washi/50 hover:text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5')}`}><Monitor size={16} /></button>
                        <button onClick={() => setMode('journal')} title="Mode Jurnal Klasik" className={`p-2 rounded-full transition-all ${mode === 'journal' ? 'bg-sumi text-washi shadow-md' : (mode === 'zen' ? 'text-washi/50 hover:text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5')}`}><FileText size={16} /></button>
                        <button onClick={() => setMode('pdf')} title="Mode PDF (2 Kolom)" className={`p-2 rounded-full transition-all ${mode === 'pdf' ? 'bg-sumi text-washi shadow-md' : (mode === 'zen' ? 'text-washi/50 hover:text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5')}`}><Columns size={16} /></button>
                        <button onClick={() => setMode('zen')} title="Zen Mode (Fokus Malam)" className={`p-2 rounded-full transition-all ${mode === 'zen' ? 'bg-washi text-sumi shadow-md' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5'}`}><BookOpen size={16} /></button>
                    </div>

                </div>

                {/* Header Artikel */}
                <header className="mb-10">
                    <div className={`flex items-center gap-2 text-sm mb-6 ${mode === 'zen' ? 'text-washi/60' : 'text-sumi-muted'}`}>
                        <span className={`font-semibold ${mode === 'zen' ? 'text-washi' : 'text-sumi'}`}>{post.author?.name || "Penulis Misterius"}</span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {readTime}</span>
                    </div>

                    <h1 className={`text-3xl md:text-5xl font-bold leading-[1.2] mb-6 tracking-tight ${mode === 'zen' ? 'text-washi' : 'text-sumi'}`}>
                        {post.title}
                    </h1>

                    <div className="flex items-center gap-2 flex-wrap">
                        {tags.map((tag, index) => (
                            <span
                                key={index}
                                className={`flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border 
                ${mode === 'zen' ? 'bg-sumi-light text-washi/80 border-washi/10' : 'bg-washi-dark text-sumi-muted border-sumi-10'}`}
                            >
                                <Hash size={12} /> {tag}
                            </span>
                        ))}
                    </div>
                </header>

                {/* Cover Image */}
                {mode !== 'zen' && (
                    <figure className={`mb-12 overflow-hidden border ${mode === 'journal' ? 'border-sumi/20 rounded-none shadow-sm' : 'border-sumi-10 rounded-2xl bg-washi-dark'}`}>
                        <img
                            src={coverImage}
                            alt={post.title}
                            className="w-full h-auto max-h-[500px] object-cover"
                        />
                    </figure>
                )}

                {/* Body Artikel (Tiptap HTML dari Database) */}
                <div
                    className={proseStyle}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />

            </article>
        </>
    );
}