"use client";

// components/ui/SearchResultItem.tsx
// Satu baris hasil search — dipakai di CommandPalette dan /search page.

import { Eye, ChevronRight, Hash } from "lucide-react";
import type { SearchResult } from "@/hooks/useGlobalSearch";

interface SearchResultItemProps {
    result: SearchResult;
    query: string;
    onClick?: () => void;
    href: string;
    compact?: boolean; // true = untuk CommandPalette, false = untuk halaman search
}

// Highlight keyword dalam teks
function Highlight({ text, query }: { text: string; query: string }) {
    if (!query || query.length < 2) return <>{text}</>;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                    ? <mark key={i} className="bg-sumi/10 text-sumi font-semibold rounded px-0.5">{part}</mark>
                    : <span key={i}>{part}</span>
            )}
        </>
    );
}

export default function SearchResultItem({
    result,
    query,
    onClick,
    href,
    compact = false,
}: SearchResultItemProps) {
    const formattedDate = new Intl.DateTimeFormat("id-ID", {
        day: "numeric", month: "short", year: "numeric",
    }).format(new Date(result.updatedAt));

    if (compact) {
        // ── CommandPalette mode: satu baris padat ─────────────────────────────
        return (
            <a
                href={href}
                onClick={onClick}
                className="flex items-center gap-3 w-full px-3 py-3 text-left rounded-xl hover:bg-sumi-10 transition-colors group"
            >
                {/* Avatar mini penulis */}
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-sumi-10 shrink-0">
                    {result.author.image
                        ? <img src={result.author.image} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-sumi-muted">
                            {(result.author.name ?? "?")[0].toUpperCase()}
                        </div>
                    }
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sumi truncate group-hover:text-sumi transition-colors">
                        <Highlight text={result.title} query={query} />
                    </p>
                    {result.snippet && (
                        <p className="text-xs text-sumi-muted truncate mt-0.5">
                            <Highlight text={result.snippet} query={query} />
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {result.author.name && (
                        <span className="text-[10px] text-sumi-muted hidden sm:block">
                            {result.author.name}
                        </span>
                    )}
                    <ChevronRight size={14} className="text-sumi-muted/0 group-hover:text-sumi-muted/100 transition-all" />
                </div>
            </a>
        );
    }

    // ── Full page mode: card dengan lebih banyak detail ───────────────────────
    return (
        <a
            href={href}
            onClick={onClick}
            className="group flex flex-col gap-3 p-5 rounded-2xl border border-sumi-10 bg-washi hover:border-sumi/20 hover:shadow-[0_8px_30px_rgb(28,28,30,0.06)] transition-all duration-300"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-sumi group-hover:text-sumi-light transition-colors leading-snug">
                    <Highlight text={result.title} query={query} />
                </h3>
                <ChevronRight
                    size={16}
                    className="text-sumi-muted/0 group-hover:text-sumi-muted/100 transition-all mt-0.5 shrink-0"
                />
            </div>

            {/* Snippet */}
            {result.snippet && (
                <p className="text-sm text-sumi-light leading-relaxed line-clamp-2">
                    <Highlight text={result.snippet} query={query} />
                </p>
            )}

            {/* Tags */}
            {result.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {result.tags.slice(0, 4).map((tag) => (
                        <span
                            key={tag}
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${tag.toLowerCase() === query.toLowerCase()
                                    ? "bg-sumi/10 border-sumi/20 text-sumi font-semibold"
                                    : "bg-sumi/5 border-sumi-10 text-sumi-muted"
                                }`}
                        >
                            <Hash size={9} /> {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer meta */}
            <div className="flex items-center gap-3 text-xs text-sumi-muted pt-1 border-t border-sumi-10">
                <div className="flex items-center gap-1.5">
                    {result.author.image && (
                        <img
                            src={result.author.image}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover"
                        />
                    )}
                    <span className="font-medium text-sumi-light">
                        {result.author.name ?? "Anonim"}
                    </span>
                    {result.author.handle && (
                        <span className="text-sumi-muted/60">@{result.author.handle}</span>
                    )}
                </div>
                <span>·</span>
                <span>{formattedDate}</span>
                {result.views != null && result.views > 0 && (
                    <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                            <Eye size={11} /> {result.views.toLocaleString("id-ID")}
                        </span>
                    </>
                )}
            </div>
        </a>
    );
}