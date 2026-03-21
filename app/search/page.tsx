"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { Search, ArrowLeft, Loader2, SlidersHorizontal } from "lucide-react";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import SearchResultItem from "@/components/ui/SearchResultItem";

function SearchPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialQuery = searchParams.get("q") ?? "";

    const [inputValue, setInputValue] = useState(initialQuery);
    const [query, setQuery] = useState(initialQuery);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const search = useGlobalSearch(query);

    // Update URL saat query berubah (tanpa reload)
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setQuery(inputValue);
            const url = inputValue
                ? `/search?q=${encodeURIComponent(inputValue)}`
                : "/search";
            window.history.replaceState(null, "", url);
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [inputValue]);

    return (
        <div className="max-w-2xl mx-auto pb-20">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 mb-8 mt-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-sumi">Search</h1>
            </div>

            {/* ── Search input ── */}
            <div className="relative mb-8">
                <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-sumi-muted pointer-events-none"
                />
                <input
                    autoFocus
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Cari artikel dari semua penulis..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-sumi-10 bg-washi text-sumi text-sm outline-none focus:border-sumi/40 transition-colors placeholder:text-sumi-muted/50 shadow-sm"
                />
                {search.isLoading && (
                    <Loader2
                        size={16}
                        className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-sumi-muted"
                    />
                )}
            </div>

            {/* ── Results ── */}
            {!query || query.length < 2 ? (
                <div className="text-center py-16 text-sumi-muted">
                    <Search size={40} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Ketik untuk mulai mencari artikel.</p>
                    <p className="text-xs mt-1 opacity-60">
                        Tekan <kbd className="px-1.5 py-0.5 border border-sumi-10 rounded text-[10px]">Ctrl+K</kbd> untuk search cepat dari mana saja.
                    </p>
                </div>
            ) : search.isLoading && search.results.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-sumi-muted">
                    <Loader2 size={28} className="animate-spin" />
                    <span className="text-sm">Mencari...</span>
                </div>
            ) : search.results.length === 0 ? (
                <div className="text-center py-16 text-sumi-muted">
                    <p className="text-base font-medium text-sumi mb-2">
                        Tidak ada hasil untuk "<strong>{query}</strong>"
                    </p>
                    <p className="text-sm">Coba kata lain, atau kata yang lebih pendek.</p>
                </div>
            ) : (
                <>
                    {/* Result count */}
                    <div className="flex items-center justify-between mb-5">
                        <p className="text-sm text-sumi-muted">
                            <span className="font-semibold text-sumi">{search.total.toLocaleString("id-ID")}</span>
                            {" "}artikel ditemukan untuk{" "}
                            <span className="font-semibold text-sumi">"{query}"</span>
                        </p>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-4">
                        {search.results.map((result) => (
                            <SearchResultItem
                                key={result.id}
                                result={result}
                                query={query}
                                href={`/post/${result.slug}`}
                                compact={false}
                            />
                        ))}
                    </div>

                    {/* Load more */}
                    {search.hasMore && (
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={search.loadMore}
                                disabled={search.isLoadingMore}
                                className="flex items-center gap-2 px-6 py-3 rounded-full border border-sumi-10 text-sm font-medium text-sumi-muted hover:text-sumi hover:border-sumi/30 hover:bg-sumi/5 transition-all disabled:opacity-50"
                            >
                                {search.isLoadingMore
                                    ? <><Loader2 size={15} className="animate-spin" /> Memuat...</>
                                    : "Tampilkan lebih banyak"
                                }
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// Suspense wrapper karena useSearchParams butuh ini di Next.js 13+
export default function SearchPageWrapper() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-sumi-muted" size={28} />
            </div>
        }>
            <SearchPage />
        </Suspense>
    );
}