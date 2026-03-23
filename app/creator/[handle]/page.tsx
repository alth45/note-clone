"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    ArrowLeft, Eye, Heart, MessageSquare, FileText,
    Users, TrendingUp, Flame, ExternalLink,
    Lock, Globe, Loader2, BarChart2,
} from "lucide-react";
import FollowButton from "@/components/ui/FollowButton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorData {
    creator: {
        name: string | null;
        handle: string | null;
        bio: string | null;
        image: string | null;
        createdAt: string;
        followerCount: number;
        followingCount: number;
    };
    stats: {
        totalViews: number;
        totalLikes: number;
        totalComments: number;
        totalPosts: number;
        streak: number;
    };
    topPosts: {
        id: string;
        title: string;
        slug: string;
        views: number;
        likes: number;
        comments: number;
    }[];
    viewsChart: {
        month: string;
        label: string;
        views: number;
    }[];
    isOwner: boolean;
    isPublic: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "jt";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "rb";
    return n.toLocaleString("id-ID");
}

function getColorFromString(str: string): string {
    const palette = [
        "#4A5568", "#718096", "#2C7A7B", "#4C51BF",
        "#C53030", "#B7791F", "#2F855A", "#2B6CB0", "#97266D",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
}

// ─── Mini bar chart (native, zero dependency) ─────────────────────────────────

function ViewsBarChart({ data }: { data: CreatorData["viewsChart"] }) {
    const maxViews = Math.max(...data.map((d) => d.views), 1);

    return (
        <div className="flex items-end gap-1.5 h-32 w-full">
            {data.map((d) => {
                const pct = (d.views / maxViews) * 100;
                return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-sumi text-washi text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {formatNum(d.views)} views
                        </div>

                        {/* Bar */}
                        <div className="w-full flex items-end" style={{ height: "100px" }}>
                            <div
                                className="w-full rounded-t-md bg-sumi/80 group-hover:bg-sumi transition-colors"
                                style={{ height: `${Math.max(pct, 2)}%` }}
                            />
                        </div>

                        {/* Label bulan */}
                        <span className="text-[9px] text-sumi-muted font-medium">
                            {d.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    icon,
    value,
    label,
    accent,
}: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    accent: string;
}) {
    return (
        <div className="flex flex-col gap-3 p-5 rounded-2xl border border-sumi-10 bg-washi hover:border-sumi/20 transition-all duration-300">
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: accent }}
            >
                {icon}
            </div>
            <div>
                <div className="text-2xl font-black text-sumi tabular-nums">{value}</div>
                <div className="text-[10px] font-bold text-sumi-muted uppercase tracking-widest mt-0.5">
                    {label}
                </div>
            </div>
        </div>
    );
}

// ─── Toggle public/private ────────────────────────────────────────────────────

function VisibilityToggle({
    isPublic,
    handle,
    onChange,
}: {
    isPublic: boolean;
    handle: string;
    onChange: (val: boolean) => void;
}) {
    const [loading, setLoading] = useState(false);

    async function toggle() {
        setLoading(true);
        try {
            const res = await fetch("/api/creator/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creatorStatsPublic: !isPublic }),
            });
            if (res.ok) onChange(!isPublic);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-sumi-10 bg-washi-dark/50">
            <div className="flex-1">
                <p className="text-sm font-bold text-sumi">
                    {isPublic ? "Stats publik" : "Stats privat"}
                </p>
                <p className="text-xs text-sumi-muted mt-0.5">
                    {isPublic
                        ? "Semua orang bisa lihat halaman ini"
                        : "Hanya kamu yang bisa lihat stats ini"
                    }
                </p>
            </div>

            <button
                onClick={toggle}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${isPublic
                    ? "bg-sumi text-washi hover:bg-sumi-light"
                    : "bg-sumi-10 text-sumi hover:bg-sumi/10"
                    }`}
            >
                {loading ? (
                    <Loader2 size={13} className="animate-spin" />
                ) : isPublic ? (
                    <><Globe size={13} /> Publik</>
                ) : (
                    <><Lock size={13} /> Privat</>
                )}
            </button>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CreatorPage({
    params,
}: {
    params: { handle: string };
}) {
    const { handle } = params;
    const [data, setData] = useState<CreatorData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/creator/${handle}`);
            if (res.status === 403) {
                setError("private");
                return;
            }
            if (!res.ok) {
                setError("notfound");
                return;
            }
            const json = await res.json();
            setData(json);
        } catch {
            setError("error");
        } finally {
            setIsLoading(false);
        }
    }, [handle]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const accentColor = getColorFromString(handle);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-sumi-muted" size={28} />
            </div>
        );
    }

    // ── Error states ──────────────────────────────────────────────────────────
    if (error === "private") {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-sumi-10 flex items-center justify-center">
                    <Lock size={28} className="text-sumi-muted" />
                </div>
                <h1 className="text-xl font-bold text-sumi">Stats Privat</h1>
                <p className="text-sm text-sumi-muted max-w-sm">
                    Creator ini belum membuka stats mereka ke publik.
                </p>
                <Link href={`/u/${handle}`} className="text-sm font-medium text-sumi hover:underline underline-offset-4">
                    Lihat profil publik →
                </Link>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4">
                <h1 className="text-xl font-bold text-sumi">Creator tidak ditemukan</h1>
                <Link href="/" className="text-sm font-medium text-sumi hover:underline underline-offset-4">
                    Kembali ke beranda →
                </Link>
            </div>
        );
    }

    const { creator, stats, topPosts, viewsChart, isOwner, isPublic } = data;
    const joinYear = new Date(creator.createdAt).getFullYear();

    return (
        <main className="max-w-4xl mx-auto pb-20">

            {/* ── Breadcrumb ── */}
            <div className="flex items-center gap-3 mt-8 mb-8">
                <Link
                    href={`/u/${handle}`}
                    className="flex items-center gap-2 text-sm font-medium text-sumi-muted hover:text-sumi transition-colors"
                >
                    <ArrowLeft size={16} /> Profil
                </Link>
                <span className="text-sumi-muted/40">/</span>
                <span className="text-sm font-medium text-sumi">Creator Stats</span>

                {/* Badge public/private */}
                <span className={`ml-auto flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${isPublic
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-sumi-10 text-sumi-muted border border-sumi-10"
                    }`}>
                    {isPublic ? <><Globe size={10} /> Publik</> : <><Lock size={10} /> Privat</>}
                </span>
            </div>

            {/* ── Header creator ── */}
            <div className="flex flex-col sm:flex-row items-start gap-6 mb-10 pb-10 border-b border-sumi-10">
                <div className="relative shrink-0">
                    <div
                        className="w-20 h-20 rounded-2xl overflow-hidden border-2"
                        style={{ borderColor: accentColor + "40" }}
                    >
                        <img
                            src={
                                creator.image ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name || handle)}&background=1c1c1e&color=f4f4f5&size=80`
                            }
                            alt={creator.name || handle}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-washi"
                        style={{ backgroundColor: accentColor }}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-sumi">{creator.name || handle}</h1>
                            <p className="text-sm text-sumi-muted">@{handle} · Bergabung {joinYear}</p>
                        </div>
                        {!isOwner && (
                            <FollowButton
                                handle={handle}
                                targetId=""
                                initialCount={creator.followerCount}
                            />
                        )}
                    </div>

                    {creator.bio && (
                        <p className="text-sm text-sumi-light mt-3 max-w-lg leading-relaxed">
                            {creator.bio}
                        </p>
                    )}

                    <div className="flex items-center gap-5 mt-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sumi">{formatNum(creator.followerCount)}</span>
                            <span className="text-sumi-muted">Pengikut</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sumi">{formatNum(creator.followingCount)}</span>
                            <span className="text-sumi-muted">Mengikuti</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Toggle visibility (hanya untuk pemilik) ── */}
            {isOwner && (
                <div className="mb-8">
                    <VisibilityToggle
                        isPublic={isPublic}
                        handle={handle}
                        onChange={(val) => setData((prev) => prev ? { ...prev, isPublic: val } : prev)}
                    />
                </div>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <StatCard icon={<Eye size={17} />} value={formatNum(stats.totalViews)} label="Total Views" accent="#1c1c1e" />
                <StatCard icon={<Heart size={17} />} value={formatNum(stats.totalLikes)} label="Total Likes" accent="#ef4444" />
                <StatCard icon={<MessageSquare size={17} />} value={formatNum(stats.totalComments)} label="Komentar" accent="#8b5cf6" />
                <StatCard icon={<FileText size={17} />} value={stats.totalPosts} label="Artikel" accent="#2563eb" />
                <StatCard icon={<Users size={17} />} value={formatNum(creator.followerCount)} label="Pengikut" accent="#059669" />
                <StatCard
                    icon={<Flame size={17} />}
                    value={`${stats.streak} hari`}
                    label="Streak nulis"
                    accent={stats.streak >= 7 ? "#f97316" : "#6b7280"}
                />
            </div>

            {/* ── Views chart ── */}
            <div className="p-6 rounded-2xl border border-sumi-10 bg-washi mb-6">
                <div className="flex items-center gap-2 mb-6">
                    <BarChart2 size={16} className="text-sumi-muted" />
                    <h2 className="text-sm font-bold text-sumi">Views per Bulan</h2>
                    <span className="text-xs text-sumi-muted/60">· 12 bulan terakhir</span>
                </div>
                <ViewsBarChart data={viewsChart} />
            </div>

            {/* ── Top artikel ── */}
            {topPosts.length > 0 && (
                <div className="p-6 rounded-2xl border border-sumi-10 bg-washi mb-6">
                    <div className="flex items-center gap-2 mb-5">
                        <TrendingUp size={16} className="text-sumi-muted" />
                        <h2 className="text-sm font-bold text-sumi">Artikel Terpopuler</h2>
                    </div>

                    <div className="flex flex-col">
                        {topPosts.map((post, i) => {
                            const maxViews = topPosts[0].views || 1;
                            const pct = (post.views / maxViews) * 100;
                            const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];

                            return (
                                <div
                                    key={post.id}
                                    className="group flex items-center gap-4 py-4 border-b border-sumi-10 last:border-0"
                                >
                                    <span className={`text-sm font-black w-5 text-center shrink-0 ${rankColors[i] ?? "text-sumi-muted/40"}`}>
                                        {i + 1}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <Link
                                                href={`/post/${post.slug}`}
                                                className="text-sm font-semibold text-sumi hover:text-sumi-light transition-colors line-clamp-1 flex-1"
                                            >
                                                {post.title}
                                            </Link>
                                            <Link
                                                href={`/post/${post.slug}`}
                                                className="text-sumi-muted/0 group-hover:text-sumi-muted transition-all shrink-0"
                                            >
                                                <ExternalLink size={13} />
                                            </Link>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="h-1.5 bg-sumi-10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-sumi rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 text-xs text-sumi-muted">
                                        <span className="flex items-center gap-1 font-semibold text-sumi">
                                            <Eye size={12} /> {formatNum(post.views)}
                                        </span>
                                        <span className="flex items-center gap-1 hidden sm:flex">
                                            <Heart size={12} /> {formatNum(post.likes)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Link ke profil publik ── */}
            <div className="flex items-center justify-between text-sm text-sumi-muted pt-4 border-t border-sumi-10">
                <Link
                    href={`/u/${handle}`}
                    className="hover:text-sumi transition-colors flex items-center gap-2"
                >
                    ← Kembali ke profil publik
                </Link>
                {isOwner && (
                    <Link
                        href="/dashboard/analytics"
                        className="hover:text-sumi transition-colors flex items-center gap-2"
                    >
                        Dashboard Analytics →
                    </Link>
                )}
            </div>
        </main>
    );
}