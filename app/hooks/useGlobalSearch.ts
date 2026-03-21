"use client";

// hooks/useGlobalSearch.ts
// Encapsulate semua logic global search:
// debounce, fetch, loading state, pagination.

import { useState, useEffect, useRef, useCallback } from "react";

export interface SearchResult {
    id: string;
    title: string;
    slug: string;
    tags: string[];
    views: number | null;
    updatedAt: string;
    snippet: string;
    author: {
        name: string | null;
        handle: string | null;
        image: string | null;
    };
}

interface UseGlobalSearchReturn {
    results: SearchResult[];
    isLoading: boolean;
    total: number;
    hasMore: boolean;
    loadMore: () => void;
    isLoadingMore: boolean;
    clear: () => void;
}

const DEBOUNCE_MS = 280;

export function useGlobalSearch(query: string): UseGlobalSearchReturn {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);

    const abortRef = useRef<AbortController | null>(null);

    const fetchResults = useCallback(async (
        q: string,
        cursorId: string | null = null,
        append: boolean = false,
    ) => {
        if (q.length < 2) {
            setResults([]);
            setTotal(0);
            setHasMore(false);
            return;
        }

        // Cancel request sebelumnya
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        if (append) setIsLoadingMore(true);
        else setIsLoading(true);

        try {
            const params = new URLSearchParams({ q, limit: "8" });
            if (cursorId) params.set("cursor", cursorId);

            const res = await fetch(`/api/search?${params}`, {
                signal: abortRef.current.signal,
            });
            const data = await res.json();

            if (append) {
                setResults((prev) => [...prev, ...(data.results ?? [])]);
            } else {
                setResults(data.results ?? []);
            }

            setTotal(data.total ?? 0);
            setHasMore(data.hasMore ?? false);
            setCursor(data.nextCursor ?? null);

        } catch (err: any) {
            if (err?.name === "AbortError") return; // cancelled — expected
            console.error("[useGlobalSearch]", err);
        } finally {
            if (append) setIsLoadingMore(false);
            else setIsLoading(false);
        }
    }, []);

    // Debounce query changes
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            setTotal(0);
            setHasMore(false);
            setCursor(null);
            return;
        }

        const timer = setTimeout(() => {
            setCursor(null);
            fetchResults(query);
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            abortRef.current?.abort();
        };
    }, [query, fetchResults]);

    const loadMore = useCallback(() => {
        if (!hasMore || isLoadingMore || !query) return;
        fetchResults(query, cursor, true);
    }, [hasMore, isLoadingMore, query, cursor, fetchResults]);

    const clear = useCallback(() => {
        abortRef.current?.abort();
        setResults([]);
        setTotal(0);
        setHasMore(false);
        setCursor(null);
    }, []);

    return { results, isLoading, total, hasMore, loadMore, isLoadingMore, clear };
}