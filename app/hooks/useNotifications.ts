"use client";

// hooks/useNotifications.ts
// Fetch notifikasi + unread count. Poll setiap 30 detik saat tab aktif.
// Mark-as-read optimistic.

import { useState, useEffect, useCallback, useRef } from "react";

export type NotifType = "NEW_COMMENT" | "NEW_REPLY" | "NEW_LIKE" | "NEW_FOLLOWER";

export interface NotifActor {
    id: string;
    name: string | null;
    handle: string | null;
    image: string | null;
}

export interface NotifItem {
    id: string;
    type: NotifType;
    isRead: boolean;
    createdAt: string;
    actor: NotifActor | null;
    post: { id: string; title: string; slug: string } | null;
    comment: { id: string; content: string } | null;
}

interface UseNotificationsReturn {
    notifications: NotifItem[];
    unreadCount: number;
    isLoading: boolean;
    hasMore: boolean;
    loadMore: () => void;
    isLoadingMore: boolean;
    markAllRead: () => void;
    markRead: (id: string) => void;
    refresh: () => void;
}

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(enabled: boolean): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<NotifItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);

    const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const mountRef = useRef(true);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchNotifs = useCallback(async (
        cursorId?: string,
        append = false,
    ) => {
        if (!enabled) return;

        if (append) setIsLoadingMore(true);
        else setIsLoading(true);

        try {
            const params = new URLSearchParams();
            if (cursorId) params.set("cursor", cursorId);

            const res = await fetch(`/api/notifications?${params}`);
            if (!res.ok) return;

            const data = await res.json();
            if (!mountRef.current) return;

            if (append) {
                setNotifications((prev) => [...prev, ...(data.notifications ?? [])]);
            } else {
                setNotifications(data.notifications ?? []);
            }

            setUnreadCount(data.unreadCount ?? 0);
            setHasMore(data.hasMore ?? false);
            setCursor(data.nextCursor ?? null);

        } catch {
            // silent
        } finally {
            if (!mountRef.current) return;
            if (append) setIsLoadingMore(false);
            else setIsLoading(false);
        }
    }, [enabled]);

    // ── Initial fetch + polling ───────────────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;

        fetchNotifs();

        // Poll saat tab aktif
        const startPoll = () => {
            pollRef.current = setInterval(() => {
                // Hanya poll unread count — tidak replace seluruh list
                fetch("/api/notifications?limit=1")
                    .then((r) => r.json())
                    .then((d) => {
                        if (mountRef.current) setUnreadCount(d.unreadCount ?? 0);
                    })
                    .catch(() => { });
            }, POLL_INTERVAL_MS);
        };

        const stopPoll = () => clearInterval(pollRef.current);

        startPoll();
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) stopPoll();
            else startPoll();
        });

        return () => {
            mountRef.current = false;
            stopPoll();
        };
    }, [enabled, fetchNotifs]);

    // ── Load more ─────────────────────────────────────────────────────────────
    const loadMore = useCallback(() => {
        if (!hasMore || isLoadingMore || !cursor) return;
        fetchNotifs(cursor, true);
    }, [hasMore, isLoadingMore, cursor, fetchNotifs]);

    // ── Mark read ─────────────────────────────────────────────────────────────
    const markRead = useCallback((id: string) => {
        // Optimistic
        setNotifications((prev) =>
            prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount((c) => Math.max(0, c - 1));

        fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [id] }),
        }).catch(() => { });
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);

        fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        }).catch(() => { });
    }, []);

    const refresh = useCallback(() => fetchNotifs(), [fetchNotifs]);

    return {
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        loadMore,
        isLoadingMore,
        markAllRead,
        markRead,
        refresh,
    };
}