import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Eye } from "lucide-react";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const series = await prisma.series.findUnique({
        where: { slug, published: true },
        select: { title: true, description: true },
    });
    if (!series) return { title: "Series tidak ditemukan" };
    return {
        title: `${series.title} — Series`,
        description: series.description || `Baca series "${series.title}"`,
    };
}

function getAccentColor(str: string): string {
    const palette = [
        "#4A5568", "#2C7A7B", "#4C51BF", "#C53030",
        "#B7791F", "#2F855A", "#2B6CB0", "#97266D",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
}

export default async function SeriesPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const series = await prisma.series.findUnique({
        where: { slug },
        include: {
            author: {
                select: { id: true, name: true, handle: true, image: true },
            },
            posts: {
                orderBy: { order: "asc" },
                include: {
                    post: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            published: true,
                            views: true,
                            createdAt: true,
                            _count: { select: { comments: true } },
                        },
                    },
                },
            },
        },
    });

    if (!series) notFound();

    // Kalau belum published, hanya author yang bisa lihat
    const session = await getServerSession(authOptions);
    const me = session?.user?.email
        ? await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        })
        : null;

    if (!series.published && me?.id !== series.authorId) notFound();

    // Hanya tampilkan artikel yang sudah published ke pembaca umum
    const isAuthor = me?.id === series.authorId;
    const visiblePosts = series.posts.filter(
        (sp) => sp.post.published || isAuthor
    );

    const totalPosts = visiblePosts.length;
    const totalViews = visiblePosts.reduce(
        (s, sp) => s + (sp.post.views ?? 0), 0
    );

    const accentColor = getAccentColor(series.slug);

    return (
        <main className="max-w-3xl mx-auto px-6 pb-20">

            {/* ── Back ── */}
            <div className="mt-8 mb-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-sumi-muted hover:text-sumi transition-colors"
                >
                    <ArrowLeft size={16} /> Beranda
                </Link>
            </div>

            {/* ── Header series ── */}
            <div
                className="rounded-3xl p-8 md:p-10 mb-10 border"
                style={{
                    borderColor: accentColor + "30",
                    backgroundColor: accentColor + "08",
                }}
            >
                <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={16} style={{ color: accentColor }} />
                    <span
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: accentColor }}
                    >
                        Series
                    </span>
                    {!series.published && (
                        <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                            DRAFT
                        </span>
                    )}
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-sumi tracking-tight mb-3">
                    {series.title}
                </h1>

                {series.description && (
                    <p className="text-sm text-sumi-light leading-relaxed mb-6 max-w-xl">
                        {series.description}
                    </p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-sumi-muted">
                    {series.author.image && (
                        <div className="flex items-center gap-2">
                            <img
                                src={series.author.image}
                                alt={series.author.name || ""}
                                className="w-6 h-6 rounded-full object-cover"
                            />
                            <Link
                                href={`/u/${series.author.handle}`}
                                className="font-medium text-sumi hover:underline underline-offset-2"
                            >
                                {series.author.name}
                            </Link>
                        </div>
                    )}
                    <span className="flex items-center gap-1">
                        <BookOpen size={12} /> {totalPosts} artikel
                    </span>
                    <span className="flex items-center gap-1">
                        <Eye size={12} /> {totalViews.toLocaleString("id-ID")} views
                    </span>
                </div>
            </div>

            {/* ── Daftar artikel (TOC) ── */}
            <div className="flex flex-col gap-3">
                {visiblePosts.length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-sumi-10 rounded-2xl">
                        <p className="text-sumi-muted text-sm">
                            Belum ada artikel dalam series ini.
                        </p>
                    </div>
                ) : (
                    visiblePosts.map((sp, index) => {
                        const post = sp.post;
                        const isAccessible = post.published;

                        return (
                            <div
                                key={sp.id}
                                className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 ${isAccessible
                                    ? "border-sumi-10 bg-washi hover:border-sumi/20 hover:shadow-[0_8px_30px_rgb(28,28,30,0.05)]"
                                    : "border-sumi-10/50 bg-washi-dark/30 opacity-60"
                                    }`}
                            >
                                {/* Nomor urut */}
                                <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 mt-0.5"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    {index + 1}
                                </div>

                                {/* Konten */}
                                <div className="flex-1 min-w-0">
                                    {isAccessible ? (
                                        <Link href={`/post/${post.slug}`}>
                                            <h3 className="text-base font-bold text-sumi group-hover:text-sumi-light transition-colors line-clamp-2 leading-snug">
                                                {post.title}
                                            </h3>
                                        </Link>
                                    ) : (
                                        <h3 className="text-base font-bold text-sumi-muted line-clamp-2 leading-snug">
                                            {post.title}
                                        </h3>
                                    )}

                                    <div className="flex items-center gap-3 mt-2 text-xs text-sumi-muted">
                                        <span className="flex items-center gap-1">
                                            <Clock size={11} />
                                            {new Intl.DateTimeFormat("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            }).format(new Date(post.createdAt))}
                                        </span>
                                        {post.views != null && (
                                            <span className="flex items-center gap-1">
                                                <Eye size={11} />
                                                {post.views.toLocaleString("id-ID")}
                                            </span>
                                        )}
                                        {!post.published && isAuthor && (
                                            <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 px-1.5 py-0.5 rounded-full">
                                                DRAFT
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Status / arrow */}
                                {isAccessible && (
                                    <CheckCircle2
                                        size={18}
                                        className="shrink-0 text-sumi-muted/20 group-hover:text-emerald-500 transition-colors mt-0.5"
                                    />
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── CTA mulai baca ── */}
            {visiblePosts.length > 0 && visiblePosts[0].post.published && (
                <div className="mt-8 flex justify-center">
                    <Link
                        href={`/post/${visiblePosts[0].post.slug}?series=${series.slug}`}
                        className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-sm"
                        style={{ backgroundColor: accentColor }}
                    >
                        <BookOpen size={16} />
                        Mulai Baca dari Awal
                    </Link>
                </div>
            )}
        </main>
    );
}