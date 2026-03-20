import Link from "next/link";
import { Clock, Layers, Folder, ChevronRight, FileText, Hash } from "lucide-react";

interface PostProps {
    isFolder?: boolean;
    postCount?: number;
    slug: string;
    title: string;
    excerpt?: string;
    author?: string;
    date?: string;
    readTime?: string;
    tags?: string[];      // ← BARU
}

function getReadableColorStyles(slug: string) {
    const palette = [
        { bg: "#4A5568", text: "#FFFFFF" }, { bg: "#718096", text: "#FFFFFF" },
        { bg: "#2C7A7B", text: "#FFFFFF" }, { bg: "#4C51BF", text: "#FFFFFF" },
        { bg: "#C53030", text: "#FFFFFF" }, { bg: "#B7791F", text: "#FFFFFF" },
        { bg: "#2F855A", text: "#FFFFFF" }, { bg: "#2B6CB0", text: "#FFFFFF" },
        { bg: "#97266D", text: "#FFFFFF" },
    ];
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
        hash = slug.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
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
    tags = [],
}: PostProps) {
    const colorStyles = getReadableColorStyles(slug);

    // ── Folder / Playlist mode ────────────────────────────────────────────────
    if (isFolder) {
        return (
            <Link href={`/folder/${slug}`} className="group relative block w-full h-full cursor-pointer">
                <div className="absolute -bottom-2 right-2 left-2 h-full bg-sumi-10 rounded-2xl transition-transform duration-300 group-hover:translate-y-1" />
                <div className="absolute -bottom-4 right-4 left-4 h-full bg-sumi-10/50 rounded-2xl transition-transform duration-300 group-hover:translate-y-2" />

                <article className="relative flex flex-col bg-washi rounded-2xl border border-sumi-10 overflow-hidden hover:border-sumi/30 transition-all duration-300 h-full z-10 shadow-sm group-hover:shadow-md">
                    <div
                        className="w-full h-48 relative overflow-hidden group-hover:opacity-90 transition-opacity duration-300"
                        style={{ backgroundColor: colorStyles.bg }}
                    >
                        <div className="absolute inset-0 flex items-center justify-center p-6 pr-24 text-center select-none">
                            <h2 className="text-2xl font-extrabold leading-tight tracking-tight line-clamp-2 drop-shadow-sm" style={{ color: colorStyles.text }}>
                                {title}
                            </h2>
                        </div>
                        <div className="absolute -bottom-6 -left-6 opacity-10 rotate-12">
                            <Folder size={120} color={colorStyles.text} />
                        </div>
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

    // ── Artikel biasa ─────────────────────────────────────────────────────────
    return (
        <article className="group flex flex-col bg-washi rounded-2xl border border-sumi-10 overflow-hidden hover:shadow-[0_8px_30px_rgb(28,28,30,0.06)] hover:border-sumi/20 transition-all duration-300 h-full">

            <Link
                href={`/post/${slug}`}
                className="block w-full h-48 relative overflow-hidden group-hover:opacity-90 transition-opacity duration-300"
                style={{ backgroundColor: colorStyles.bg }}
            >
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center select-none">
                    <h2 className="text-2xl font-extrabold leading-tight tracking-tight line-clamp-2 drop-shadow-sm" style={{ color: colorStyles.text }}>
                        {title}
                    </h2>
                </div>
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

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {tags.slice(0, 3).map((tag) => (
                            <Link
                                key={tag}
                                href={`/?tag=${encodeURIComponent(tag)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sumi/5 border border-sumi-10 text-sumi-muted hover:text-sumi hover:border-sumi/30 transition-colors"
                            >
                                <Hash size={9} />
                                {tag}
                            </Link>
                        ))}
                        {tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-sumi-muted/60">
                                +{tags.length - 3}
                            </span>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2 text-xs text-sumi-muted pt-4 border-t border-sumi-10 mt-auto">
                    <Clock size={14} />
                    <span>{readTime} read</span>
                </div>
            </div>
        </article>
    );
}