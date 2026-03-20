"use client";

import { Hash, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface TagItem {
    tag: string;
    count: number;
}

interface CategoryFilterProps {
    tags: TagItem[];
    activeTag: string | null;
}

export default function CategoryFilter({ tags, activeTag }: CategoryFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const setTag = useCallback((tag: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (tag) {
            params.set("tag", tag);
        } else {
            params.delete("tag");
        }
        router.push(`/?${params.toString()}`, { scroll: false });
    }, [router, searchParams]);

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">

            {/* Tombol Semua */}
            <button
                onClick={() => setTag(null)}
                className={`
                    flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium
                    transition-all duration-300 border shrink-0
                    ${!activeTag
                        ? "bg-sumi text-washi border-sumi shadow-sm"
                        : "bg-washi border-sumi-10 text-sumi-muted hover:text-sumi hover:border-sumi/30"
                    }
                `}
            >
                Semua
            </button>

            {/* Tombol per tag */}
            {tags.map(({ tag, count }) => {
                const isActive = activeTag === tag;
                return (
                    <button
                        key={tag}
                        onClick={() => setTag(isActive ? null : tag)}
                        className={`
                            flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 rounded-full
                            text-sm font-medium transition-all duration-300 border shrink-0
                            ${isActive
                                ? "bg-sumi text-washi border-sumi shadow-sm"
                                : "bg-washi border-sumi-10 text-sumi-muted hover:text-sumi hover:border-sumi/30"
                            }
                        `}
                    >
                        {isActive
                            ? <X size={11} className="text-washi/70" />
                            : <Hash size={11} className="text-sumi-muted/60" />
                        }
                        {tag}
                        <span className={`text-[10px] ${isActive ? "text-washi/60" : "text-sumi-muted/50"}`}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}