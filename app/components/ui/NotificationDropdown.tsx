"use client";

// components/ui/NotificationDropdown.tsx

import { useRef, useEffect } from "react";
import {
    Bell, MessageSquare, Heart, UserPlus,
    CornerDownRight, Loader2, CheckCheck, X
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNotifications, type NotifItem, type NotifType } from "@/hooks/useNotifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}j`;
    if (days < 7) return `${days}h`;
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" })
        .format(new Date(dateStr));
}

const TYPE_CONFIG: Record<NotifType, {
    icon: React.ReactNode;
    color: string;
    label: (actor: string, postTitle?: string) => string;
}> = {
    NEW_COMMENT: {
        icon: <MessageSquare size={14} />,
        color: "bg-blue-500",
        label: (a, p) => `${a} mengomentari "${p ?? "artikelmu"}"`,
    },
    NEW_REPLY: {
        icon: <CornerDownRight size={14} />,
        color: "bg-purple-500",
        label: (a) => `${a} membalas komentarmu`,
    },
    NEW_LIKE: {
        icon: <Heart size={14} />,
        color: "bg-red-500",
        label: (a, p) => `${a} menyukai "${p ?? "artikelmu"}"`,
    },
    NEW_FOLLOWER: {
        icon: <UserPlus size={14} />,
        color: "bg-emerald-500",
        label: (a) => `${a} mulai mengikutimu`,
    },
};

function notifHref(notif: NotifItem): string {
    if (notif.type === "NEW_FOLLOWER" && notif.actor?.handle) {
        return `/u/${notif.actor.handle}`;
    }
    if (notif.post?.slug) {
        return `/post/${notif.post.slug}`;
    }
    return "#";
}

// ─── Single notif row ─────────────────────────────────────────────────────────

function NotifRow({
    notif,
    onRead,
}: {
    notif: NotifItem;
    onRead: (id: string) => void;
}) {
    const cfg = TYPE_CONFIG[notif.type];
    const actorName = notif.actor?.name ?? "Seseorang";
    const label = cfg.label(actorName, notif.post?.title);
    const href = notifHref(notif);

    const handleClick = () => {
        if (!notif.isRead) onRead(notif.id);
    };

    return (
        <Link
            href={href}
            onClick={handleClick}
            className={`flex items-start gap-3 px-4 py-3.5 hover:bg-sumi/5 transition-colors group relative ${!notif.isRead ? "bg-blue-50/60" : ""
                }`}
        >
            {/* Unread dot */}
            {!notif.isRead && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}

            {/* Actor avatar + type icon */}
            <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-sumi-10">
                    {notif.actor?.image
                        ? <img src={notif.actor.image} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-sumi-muted">
                            {(notif.actor?.name ?? "?")[0].toUpperCase()}
                        </div>
                    }
                </div>
                {/* Type icon badge */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${cfg.color} flex items-center justify-center text-white`}>
                    <span style={{ fontSize: 9 }}>{cfg.icon}</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${notif.isRead ? "text-sumi-muted" : "text-sumi font-medium"}`}>
                    {label}
                </p>
                {notif.comment && (
                    <p className="text-[10px] text-sumi-muted/70 mt-0.5 truncate italic">
                        "{notif.comment.content.slice(0, 60)}{notif.comment.content.length > 60 ? "…" : ""}"
                    </p>
                )}
                <p className="text-[10px] text-sumi-muted/50 mt-0.5">
                    {timeAgo(notif.createdAt)}
                </p>
            </div>
        </Link>
    );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationDropdown({
    isOpen,
    onClose,
}: NotificationDropdownProps) {
    const { data: session } = useSession();
    const panelRef = useRef<HTMLDivElement>(null);

    const {
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        loadMore,
        isLoadingMore,
        markAllRead,
        markRead,
    } = useNotifications(isOpen && !!session);

    // Tutup saat klik di luar
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) onClose();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={panelRef}
            className="absolute right-0 top-full mt-2 w-80 bg-washi border border-sumi-10 rounded-2xl shadow-[0_8px_40px_rgb(28,28,30,0.12)] z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
            style={{ maxHeight: "min(480px, 80vh)" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-sumi-10 bg-washi-dark/50 shrink-0">
                <div className="flex items-center gap-2">
                    <Bell size={15} className="text-sumi-muted" />
                    <span className="text-sm font-bold text-sumi">Notifikasi</span>
                    {unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            title="Tandai semua sudah dibaca"
                            className="p-1.5 text-sumi-muted hover:text-sumi hover:bg-sumi/5 rounded-lg transition-colors"
                        >
                            <CheckCheck size={14} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 text-sumi-muted hover:text-sumi hover:bg-sumi/5 rounded-lg transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 scrollbar-hide">
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sumi-muted">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-xs">Memuat...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-sumi-muted">
                        <Bell size={28} className="mb-3 opacity-20" />
                        <p className="text-sm font-medium">Belum ada notifikasi</p>
                        <p className="text-xs opacity-60 mt-1">
                            Aktivitas akan muncul di sini
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-sumi-10/50">
                            {notifications.map((notif) => (
                                <NotifRow
                                    key={notif.id}
                                    notif={notif}
                                    onRead={markRead}
                                />
                            ))}
                        </div>

                        {hasMore && (
                            <button
                                onClick={loadMore}
                                disabled={isLoadingMore}
                                className="w-full py-3 text-xs text-sumi-muted hover:text-sumi transition-colors flex items-center justify-center gap-1.5 border-t border-sumi-10"
                            >
                                {isLoadingMore
                                    ? <><Loader2 size={12} className="animate-spin" /> Memuat...</>
                                    : "Tampilkan lebih banyak"
                                }
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}