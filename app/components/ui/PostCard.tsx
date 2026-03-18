import Link from "next/link";
import { Clock, Layers, Folder, ChevronRight, FileText } from "lucide-react";

interface PostProps {
    // Tambahan buat mode Playlist/Folder
    isFolder?: boolean;
    postCount?: number;

    // Props bawaan artikel
    slug: string;
    title: string;
    excerpt?: string;
    author?: string;
    date?: string;
    readTime?: string;
    // image?: string; // Dihapus karena kita full pakai solid color
}

// --- MESIN GENERATOR WARNA SAKTI (STABLE RANDOM & READABLE) ---
function getReadableColorStyles(slug: string) {
    // 1. Palet warna Muted/Pastel (Adem, Gak Alay, Kontras sama Putih)
    const palette = [
        { bg: "#4A5568", text: "#FFFFFF" }, // Slate
        { bg: "#718096", text: "#FFFFFF" }, // Gray
        { bg: "#2C7A7B", text: "#FFFFFF" }, // Teal
        { bg: "#4C51BF", text: "#FFFFFF" }, // Indigo
        { bg: "#C53030", text: "#FFFFFF" }, // Red
        { bg: "#B7791F", text: "#FFFFFF" }, // Yellow/Orange
        { bg: "#2F855A", text: "#FFFFFF" }, // Green
        { bg: "#2B6CB0", text: "#FFFFFF" }, // Blue
        { bg: "#97266D", text: "#FFFFFF" }, // Pink/Magenta
    ];

    // 2. Fungsi HASH: Ubah slug jadi angka biar konsisten
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
        // Logika acak tapi deterministic (slug sama = angka sama)
        hash = slug.charCodeAt(i) + ((hash << 5) - hash);
    }

    // 3. Ambil warna berdasarkan index hash (Modulus)
    const index = Math.abs(hash) % palette.length;
    return palette[index];
}

export default function PostCard({
    isFolder = false,
    postCount = 0,
    slug,
    title,
    excerpt,
    author,
    date,
    readTime,
}: PostProps) {

    // Generate warna unik berdasarkan slug
    const colorStyles = getReadableColorStyles(slug);

    // ==========================================
    // 🎨 RENDER MODE 1: KARTU PLAYLIST / FOLDER
    // ==========================================
    if (isFolder) {
        return (
            <Link href={`/folder/${slug}`} className="group relative block w-full h-full cursor-pointer">
                {/* Efek Tumpukan Kertas ala Playlist (Dua div di belakang) */}
                <div className="absolute -bottom-2 right-2 left-2 h-full bg-sumi-10 rounded-2xl transition-transform duration-300 group-hover:translate-y-1"></div>
                <div className="absolute -bottom-4 right-4 left-4 h-full bg-sumi-10/50 rounded-2xl transition-transform duration-300 group-hover:translate-y-2"></div>

                <article className="relative flex flex-col bg-washi rounded-2xl border border-sumi-10 overflow-hidden hover:border-sumi/30 transition-all duration-300 h-full z-10 shadow-sm group-hover:shadow-md">

                    {/* --- COVER BANNER PLAYLIST DENGAN SOLID COLOR --- */}
                    <div
                        className="w-full h-48 relative overflow-hidden group-hover:opacity-90 transition-opacity duration-300"
                        style={{ backgroundColor: colorStyles.bg }}
                    >
                        {/* Judul Folder di Tengah Cover */}
                        <div className="absolute inset-0 flex items-center justify-center p-6 pr-24 text-center select-none">
                            <h2
                                className="text-2xl font-extrabold leading-tight tracking-tight line-clamp-2 drop-shadow-sm"
                                style={{ color: colorStyles.text }}
                            >
                                {title}
                            </h2>
                        </div>

                        {/* Ikon Latar Belakang Tipis */}
                        <div className="absolute -bottom-6 -left-6 opacity-10 rotate-12">
                            <Folder size={120} color={colorStyles.text} />
                        </div>

                        {/* Overlay Kanan (Jumlah Item) ala YouTube */}
                        <div className="absolute top-0 right-0 w-1/4 min-w-[60px] h-full bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 transition-colors group-hover:bg-black/40 border-l border-white/10">
                            <Layers size={24} />
                            <span className="text-sm font-bold tracking-widest">{postCount}</span>
                        </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-center gap-2 text-xs text-sumi-muted mb-2 uppercase tracking-wider font-bold">
                            <Folder size={12} /> Playlist
                        </div>
                        <h3 className="text-lg font-bold text-sumi mb-2 leading-snug group-hover:text-sumi-light transition-colors line-clamp-2">
                            {title}
                        </h3>

                        <div className="mt-auto pt-4 flex items-center justify-between text-xs font-bold text-sumi-light group-hover:text-sumi transition-colors">
                            <span>Buka Koleksi</span>
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </article>
            </Link>
        );
    }

    // ==========================================
    // 🎨 RENDER MODE 2: KARTU ARTIKEL STANDAR
    // ==========================================
    return (
        <article className="group flex flex-col bg-washi rounded-2xl border border-sumi-10 overflow-hidden hover:shadow-[0_8px_30px_rgb(28,28,30,0.06)] hover:border-sumi/20 transition-all duration-300 h-full">

            {/* --- BANNER SOLID COLOR ARTIKEL --- */}
            <Link
                href={`/post/${slug}`}
                className="block w-full h-48 relative overflow-hidden group-hover:opacity-90 transition-opacity duration-300"
                style={{ backgroundColor: colorStyles.bg }}
            >
                {/* Judul Artikel Raksasa di Tengah Cover */}
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center select-none">
                    <h2
                        className="text-2xl font-extrabold leading-tight tracking-tight line-clamp-2 drop-shadow-sm"
                        style={{ color: colorStyles.text }}
                    >
                        {title}
                    </h2>
                </div>

                {/* Ikon File Tipis di Background */}
                <div className="absolute -bottom-6 -right-6 opacity-10 rotate-12">
                    <FileText size={120} color={colorStyles.text} />
                </div>
            </Link>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-sumi-muted mb-3">
                    <span className="font-semibold text-sumi-light">{author}</span>
                    <span>•</span>
                    <span>{date}</span>
                </div>

                <Link href={`/post/${slug}`} className="block flex-1">
                    <h3 className="text-lg font-bold text-sumi mb-2 leading-snug group-hover:text-sumi-light transition-colors line-clamp-2">
                        {title}
                    </h3>
                    <p className="text-sm text-sumi-light leading-relaxed line-clamp-2 mb-4">
                        {excerpt}
                    </p>
                </Link>

                <div className="flex items-center gap-2 text-xs text-sumi-muted pt-4 border-t border-sumi-10 mt-auto">
                    <Clock size={14} />
                    <span>{readTime} read</span>
                </div>
            </div>
        </article>
    );
}