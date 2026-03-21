"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    ArrowLeft, Eye, Heart, MessageSquare, FileText,
    TrendingUp, TrendingDown, Minus, ExternalLink,
    Hash, BarChart2, Loader2, RefreshCw, Calendar,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Lazy-load chart — tidak mau Chart.js di bundle utama
const ViewsChart = dynamic(() => import("@/components/analytics/ViewsChart"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[280px] bg-sumi-10/40 rounded-xl animate-pulse" />
    ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface SummaryStats {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalPosts: number;
    viewsDelta: number | null;
}

interface TopPost {
    id: string;
    title: string;
    slug: string;
    views: number;
    likes: number;
    comments: number;
    tags: string[];
    createdAt: string;
}

interface ChartPoint {
    date: string;
    label: string;
    views: number;
}

interface TopTag {
    tag: string;
    views: number;
}

interface AnalyticsData {
    summary: SummaryStats;
    chartData: ChartPoint[];
    topPosts: TopPost[];
    topTags: TopTag[];
    period: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "jt";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "rb";
    return n.toLocaleString("id-ID");
}

function DeltaBadge({ delta }: { delta: number | null }) {
    if (delta === null) {
        return (
            <span className="flex items-center gap-0.5 text-[10px] text-sumi-muted/60">
                <Minus size={10} /> N/A
            </span>
        );
    }
    if (delta > 0) {
        return (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                <TrendingUp size={10} /> +{delta}%
            </span>
        );
    }
    if (delta < 0) {
        return (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                <TrendingDown size={10} /> {delta}%
            </span>
        );
    }
    return (
        <span className="flex items-center gap-0.5 text-[10px] text-sumi-muted/60">
            <Minus size={10} /> 0%
        </span>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    icon, label, value, delta, accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    delta?: number | null;
    accent: string;
}) {
    return (
        <div className="group flex flex-col gap-3 p-5 rounded-2xl border border-sumi-10 bg-washi hover:border-sumi/20 hover:shadow-[0_8px_30px_rgb(28,28,30,0.05)] transition-all duration-300">
            <div className="flex items-center justify-between">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: accent }}
                >
                    {icon}
                </div>
                {delta !== undefined && <DeltaBadge delta={delta ?? null} />}
            </div>
            <div>
                <div className="text-2xl font-black text-sumi tabular-nums">{value}</div>
                <div className="text-xs font-bold text-sumi-muted uppercase tracking-widest mt-0.5">
                    {label}
                </div>
            </div>
        </div>
    );
}

// ─── Top Post Row ─────────────────────────────────────────────────────────────

function TopPostRow({
    post,
    rank,
    maxViews,
}: {
    post: TopPost;
    rank: number;
    maxViews: number;
}) {
    const pct = maxViews > 0 ? (post.views / maxViews) * 100 : 0;
    const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];

    return (
        <div className="group flex items-center gap-4 p-4 rounded-xl hover:bg-sumi/5 transition-colors">
            {/* Rank */}
            <span className={`text-sm font-black w-5 text-center shrink-0 ${rankColors[rank - 1] ?? "text-sumi-muted/40"}`}>
                {rank}
            </span>

            {/* Bar + title */}
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
                        className="text-sumi-muted/0 group-hover:text-sumi-muted/100 transition-all shrink-0"
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

            {/* Stats */}
            <div className="flex items-center gap-3 shrink-0 text-xs text-sumi-muted">
                <span className="flex items-center gap-1 font-semibold text-sumi">
                    <Eye size={12} /> {formatNum(post.views)}
                </span>
                <span className="flex items-center gap-1 hidden sm:flex">
                    <Heart size={12} /> {formatNum(post.likes)}
                </span>
                <span className="flex items-center gap-1 hidden sm:flex">
                    <MessageSquare size={12} /> {post.comments}
                </span>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PERIODS = [7, 30, 90] as const;
type Period = typeof PERIODS[number];

export default function AnalyticsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [period, setPeriod] = useState<Period>(30);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchAnalytics = useCallback(async (p: Period) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/analytics?period=${p}`);
            const json = await res.json();
            if (res.ok) {
                setData(json);
                setLastUpdate(new Date());
            }
        } catch {
            // silent — tampilkan skeleton
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
        if (status === "authenticated") fetchAnalytics(period);
    }, [status, period]);

    // ── Guard ─────────────────────────────────────────────────────────────────
    if (status === "loading" || status === "unauthenticated") {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-sumi-muted" size={28} />
            </div>
        );
    }

    const s = data?.summary;

    return (
        <div className="max-w-5xl mx-auto pb-20">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-8 mb-10">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 rounded-full text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-sumi tracking-tight flex items-center gap-2">
                            <BarChart2 size={22} className="text-sumi-muted" />
                            Analytics
                        </h1>
                        {lastUpdate && (
                            <p className="text-xs text-sumi-muted mt-0.5">
                                Diperbarui {lastUpdate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Period selector */}
                    <div className="flex bg-sumi-10/60 rounded-full p-0.5">
                        {PERIODS.map((p) => (
                            <button
                                key={p}
                                onClick={() => { setPeriod(p); }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${period === p
                                        ? "bg-washi text-sumi shadow-sm"
                                        : "text-sumi-muted hover:text-sumi"
                                    }`}
                            >
                                {p}h
                            </button>
                        ))}
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchAnalytics(period)}
                        disabled={isLoading}
                        className="p-2 rounded-full text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors disabled:opacity-40"
                        title="Refresh data"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* ── Summary stat cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={<Eye size={17} />}
                    label="Total Views"
                    value={isLoading ? "—" : formatNum(s?.totalViews ?? 0)}
                    delta={s?.viewsDelta}
                    accent="#1c1c1e"
                />
                <StatCard
                    icon={<Heart size={17} />}
                    label="Total Likes"
                    value={isLoading ? "—" : formatNum(s?.totalLikes ?? 0)}
                    accent="#ef4444"
                />
                <StatCard
                    icon={<MessageSquare size={17} />}
                    label="Komentar"
                    value={isLoading ? "—" : formatNum(s?.totalComments ?? 0)}
                    accent="#8b5cf6"
                />
                <StatCard
                    icon={<FileText size={17} />}
                    label="Artikel"
                    value={isLoading ? "—" : s?.totalPosts ?? 0}
                    accent="#2563eb"
                />
            </div>

            {/* ── Views chart ── */}
            <div className="p-6 rounded-2xl border border-sumi-10 bg-washi mb-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-sumi-muted" />
                        <h2 className="text-sm font-bold text-sumi">
                            Views per Hari
                        </h2>
                        <span className="text-xs text-sumi-muted/60">
                            · {period} hari terakhir
                        </span>
                    </div>
                </div>

                <ViewsChart
                    data={data?.chartData ?? []}
                    period={period}
                    isLoading={isLoading}
                />
            </div>

            {/* ── Bottom grid: top posts + top tags ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Top posts — 2/3 lebar */}
                <div className="md:col-span-2 p-6 rounded-2xl border border-sumi-10 bg-washi">
                    <div className="flex items-center gap-2 mb-5">
                        <TrendingUp size={15} className="text-sumi-muted" />
                        <h2 className="text-sm font-bold text-sumi">Artikel Terpopuler</h2>
                        <span className="text-xs text-sumi-muted/60">by views</span>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col gap-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-14 rounded-xl bg-sumi-10/40 animate-pulse" />
                            ))}
                        </div>
                    ) : !data?.topPosts.length ? (
                        <div className="py-10 text-center text-sumi-muted">
                            <p className="text-sm">Belum ada artikel yang dipublikasikan.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {data.topPosts.map((post, i) => (
                                <TopPostRow
                                    key={post.id}
                                    post={post}
                                    rank={i + 1}
                                    maxViews={data.topPosts[0].views}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Top tags — 1/3 lebar */}
                <div className="p-6 rounded-2xl border border-sumi-10 bg-washi">
                    <div className="flex items-center gap-2 mb-5">
                        <Hash size={15} className="text-sumi-muted" />
                        <h2 className="text-sm font-bold text-sumi">Tag Terpopuler</h2>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-8 rounded-lg bg-sumi-10/40 animate-pulse" />
                            ))}
                        </div>
                    ) : !data?.topTags.length ? (
                        <p className="text-sm text-sumi-muted py-4">Belum ada tag.</p>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {data.topTags.map(({ tag, views }, i) => {
                                const maxTagViews = data.topTags[0].views;
                                const pct = (views / maxTagViews) * 100;
                                return (
                                    <div key={tag} className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1 font-medium text-sumi">
                                                <Hash size={10} className="text-sumi-muted" />
                                                {tag}
                                            </span>
                                            <span className="text-sumi-muted tabular-nums">
                                                {formatNum(views)}
                                            </span>
                                        </div>
                                        <div className="h-1 bg-sumi-10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor: [
                                                        "#1c1c1e", "#3b3b3d", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb"
                                                    ][i] ?? "#e5e7eb",
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* CTA ke halaman search by tag */}
                    {!isLoading && data?.topTags.length && (
                        <Link
                            href="/?tag="
                            className="flex items-center gap-1 mt-5 text-xs text-sumi-muted hover:text-sumi transition-colors"
                        >
                            Jelajahi semua tag →
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Link kembali ke dashboard ── */}
            <div className="mt-8 pt-6 border-t border-sumi-10 flex items-center justify-between text-sm text-sumi-muted">
                <Link href="/dashboard" className="hover:text-sumi transition-colors flex items-center gap-2">
                    ← Kembali ke Dashboard
                </Link>
                <span className="text-xs opacity-50">
                    Data diestimasi berdasarkan distribusi views historis
                </span>
            </div>
        </div>
    );
}