"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Hash, BookOpen, FileText, Columns, Monitor, List } from "lucide-react";
import ReadingProgress from "@/components/ui/ReadingProgress";
import FloatingActionBar from "@/components/ui/FloatingActionBar";
import { todo } from "node:test";

type ReadMode = 'default' | 'journal' | 'pdf' | 'zen';

// Tipe data buat Daftar Isi

interface TocItem {
    id: string;
    text: string;
    level: number;
}

// Terima props 'post' dari Server Component (page.tsx)
export default function ReadClient({ post }: { post: any }) {
    const [mode, setMode] = useState<ReadMode>('default');

    // --- STATE DAFTAR ISI (TOC) ---
    const [toc, setToc] = useState<TocItem[]>([]);
    const [activeId, setActiveId] = useState<string>("");

    // --- PENGOLAHAN DATA DATABASE ---
    // 1. Prisma nyimpen konten Tiptap lu dalam bentuk JSON, kita pastiin dia jadi String HTML
    const htmlContent = typeof post.content === 'string'
        ? post.content
        : (post.content?.html || "");

    // 2. Format Tanggal otomatis
    const formattedDate = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date(post.updatedAt));

    // 3. Hitung otomatis estimasi waktu baca
    const wordCount = htmlContent.replace(/<[^>]*>?/gm, '').split(/\s+/).length;
    const readTime = `${Math.ceil(wordCount / 200)} min read`;

    // 4. Fallback Cover Image
    const coverImage = post.coverImage || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop";

    // (Karena kita belum bikin tabel relasi Tags, kita kasih teks statis elegan dulu)
    const tags = ["Eksplorasi", "Catatan"];

    // --- LOGIKA MATA-MATA (SCANNER DAFTAR ISI) ---
    useEffect(() => {
        // Cari ID kontainer artikelnya
        const article = document.getElementById("article-content");
        if (!article) return;

        // Ambil semua H2 dan H3 di dalam artikel
        const headings = Array.from(article.querySelectorAll("h2, h3"));

        const tocData = headings.map((heading, index) => {
            const text = heading.textContent || "";
            // Bikin ID dari teks kalau heading-nya belum punya ID
            const slug = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

            if (!heading.id) {
                heading.id = slug;
            }

            return {
                id: heading.id,
                text: text,
                level: heading.tagName === "H2" ? 2 : 3
            };
        });

        setToc(tocData);

        // --- INTERSECTION OBSERVER BUAT HIGHLIGHT OTOMATIS SAAT SCROLL ---
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // Kalau judulnya masuk ke area pandang atas layar
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: "0px 0px -80% 0px" } // Offset biar highlight pindah saat judul ada di 20% atas layar
        );

        headings.forEach((h) => observer.observe(h));

        return () => observer.disconnect();
    }, [htmlContent]);

    // Fungsi klik daftar isi biar scroll mulus
    const scrollToHeading = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            // Offset 100px ke atas biar gak mepet banget pas di-scroll
            const y = element.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };


    // --- LOGIKA STYLING BERDASARKAN MODE BACA ---
    let containerStyle = "mx-auto pb-20 transition-all duration-700 ease-in-out ";

    // Tambahin CSS buat slide/iframe biar tetep rapi
    let proseStyle = "prose max-w-none transition-all duration-700 ease-in-out " +
        "[&_.slide-wrapper]:w-full [&_.slide-wrapper]:aspect-video [&_.slide-wrapper]:my-10 [&_.slide-wrapper]:rounded-2xl [&_.slide-wrapper]:overflow-hidden [&_.slide-wrapper]:shadow-lg [&_.slide-wrapper]:border [&_.slide-wrapper]:border-sumi-10 " +
        "[&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0 [&_iframe]:absolute [&_iframe]:inset-0 ";

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
            proseStyle += " [&_.slide-wrapper]:border-washi/10 [&_.slide-wrapper]:shadow-2xl";
            break;
    }

    return (
        <div className="relative">
            <ReadingProgress />

            {/* --- WIDGET DAFTAR ISI (TOC) --- */}
            {toc.length > 0 && mode !== 'zen' && mode !== 'pdf' && (
                <div className="hidden xl:block fixed top-32 right-8 xl:right-[max(2rem,calc((100vw-65rem)/2))] w-64 animate-in fade-in slide-in-from-right-8 duration-500 z-30">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-sumi-muted mb-4 flex items-center gap-2">
                        <List size={14} /> Di Halaman Ini
                    </h4>
                    <div className="relative border-l border-sumi-10 pl-4 space-y-3 max-h-[70vh] overflow-y-auto scrollbar-hide">
                        {toc.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => scrollToHeading(item.id)}
                                className={`block w-full text-left text-sm transition-all duration-300 relative ${activeId === item.id
                                    ? "text-sumi font-bold scale-105 origin-left"
                                    : "text-sumi-muted hover:text-sumi"
                                    } ${item.level === 3 ? "pl-3 text-[13px]" : ""}`} // Heading 3 agak menjorok ke dalam
                            >
                                {/* Titik indikator nyala kalau lagi aktif dibaca */}
                                {activeId === item.id && (
                                    <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sumi shadow-[0_0_8px_rgba(28,28,30,0.5)] transition-all duration-300" />
                                )}
                                <span className="line-clamp-2">{item.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Floating Action Bar (Disembunyikan saat Zen Mode biar fokus 100%) */}
            {mode !== 'zen' && <FloatingActionBar postId={post.id}
                initialLikes={post.likesCount}
                hasLiked={false}
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

                {/* --- Body Artikel (Tiptap HTML dari Database) --- */}
                {/* ID "article-content" ditambahkan di sini buat target scanner useEffect! */}
                <div
                    id="article-content"
                    className={proseStyle}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />

            </article>
        </div>
    );
}