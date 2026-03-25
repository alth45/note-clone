import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Eye, Calendar, TrendingUp } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import PostCard from "@/components/ui/PostCard";
import FollowButton from "@/components/ui/FollowButton";

export const revalidate = 60;

export async function generateMetadata({ params }: any) {
    const { handle } = await params;
    const user = await prisma.user.findUnique({
        where: { handle },
        select: { name: true, bio: true },
    });
    if (!user) return { title: "Profil tidak ditemukan" };
    return {
        title: `${user.name} — NoteOS`,
        description: user.bio || `Artikel dan catatan dari ${user.name}`,
    };
}

function getColorFromString(str: string) {
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

function formatCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "jt";
    if (n >= 1000) return (n / 1000).toFixed(1) + "rb";
    return String(n);
}

export default async function PublicProfilePage({ params }: any) {
    const { handle } = await params;

    const [user, session] = await Promise.all([
        prisma.user.findUnique({
            where: { handle },
            select: {
                id: true,
                name: true,
                handle: true,
                bio: true,
                image: true,
                createdAt: true,
                creatorStatsPublic: true,
                posts: {
                    where: { published: true },
                    orderBy: { updatedAt: "desc" },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        views: true,
                        likesCount: true,
                        updatedAt: true,
                        folderId: true,
                        tags: true,
                        author: { select: { name: true } },
                    },
                },
                _count: {
                    select: {
                        posts: { where: { published: true } },
                        followers: true,
                        following: true,
                    },
                },
            },
        }),
        getServerSession(authOptions),
    ]);

    if (!user) notFound();

    let isFollowing = false;
    let isOwnProfile = false;

    if (session?.user?.email) {
        const me = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, handle: true },
        });
        if (me) {
            isOwnProfile = me.handle === handle;
            if (!isOwnProfile) {
                const row = await prisma.follow.findUnique({
                    where: {
                        followerId_followingId: {
                            followerId: me.id,
                            followingId: user.id,
                        },
                    },
                });
                isFollowing = !!row;
            }
        }
    }

    // Tampilkan link creator stats kalau: pemilik profil ATAU stats sudah public
    const showCreatorLink = isOwnProfile || user.creatorStatsPublic;

    const totalViews = user.posts.reduce((s, p) => s + (p.views || 0), 0);
    const totalLikes = user.posts.reduce((s, p) => s + (p.likesCount || 0), 0);
    const accentColor = getColorFromString(handle);
    const joinYear = new Date(user.createdAt).getFullYear();
    const loosePosts = user.posts.filter((p) => !p.folderId);

    return (
        <main className="min-h-screen bg-washi">

            {/* ── Top nav ── */}
            <div className="max-w-4xl mx-auto px-6 pt-8">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-sumi-muted hover:text-sumi transition-colors mb-10">
                    <ArrowLeft size={16} /> Beranda
                </Link>
            </div>

            {/* ── Header profil ── */}
            <div className="max-w-4xl mx-auto px-6 mb-12">
                <div className="flex flex-col sm:flex-row items-start gap-6">

                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2"
                            style={{ borderColor: accentColor + "40" }}
                        >
                            <img
                                src={user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || handle)}&background=1c1c1e&color=f4f4f5&size=96`}
                                alt={user.name || handle}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-washi"
                            style={{ backgroundColor: accentColor }}
                        />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-sumi tracking-tight">
                                    {user.name || handle}
                                </h1>
                                <p className="text-sm text-sumi-muted mt-0.5">@{handle}</p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* ── Link Creator Stats ── */}
                                {showCreatorLink && (
                                    <Link
                                        href={`/creator/${handle}`}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sumi-10 text-xs font-medium text-sumi-muted hover:text-sumi hover:border-sumi/30 hover:bg-sumi/5 transition-colors"
                                        title={isOwnProfile ? "Lihat stats creator kamu" : "Lihat stats creator"}
                                    >
                                        <TrendingUp size={13} />
                                        {isOwnProfile ? "Stats Creator" : "Creator Stats"}
                                    </Link>
                                )}

                                {/* Follow button */}
                                {!isOwnProfile && (
                                    <FollowButton
                                        handle={handle}
                                        targetId={user.id}
                                        initialFollowing={isFollowing}
                                        initialCount={user._count.followers}
                                    />
                                )}
                            </div>
                        </div>

                        {user.bio && (
                            <p className="text-sm text-sumi-light leading-relaxed mt-3 max-w-lg">
                                {user.bio}
                            </p>
                        )}

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-sumi-muted">
                            <span className="flex items-center gap-1.5">
                                <Calendar size={12} /> Bergabung {joinYear}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <FileText size={12} /> {user._count.posts} artikel
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Eye size={12} /> {formatCount(totalViews)} views
                            </span>
                        </div>

                        {/* Follower / Following counts */}
                        <div className="flex items-center gap-5 mt-4 text-sm">
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sumi">{formatCount(user._count.followers)}</span>
                                <span className="text-sumi-muted">Pengikut</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sumi">{formatCount(user._count.following)}</span>
                                <span className="text-sumi-muted">Mengikuti</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats strip */}
                <div
                    className="grid grid-cols-3 gap-3 mt-8 p-4 rounded-2xl border"
                    style={{ borderColor: accentColor + "30", backgroundColor: accentColor + "08" }}
                >
                    {[
                        { label: "Artikel", value: formatCount(user._count.posts) },
                        { label: "Total Views", value: formatCount(totalViews) },
                        { label: "Total Likes", value: formatCount(totalLikes) },
                    ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                            <div className="text-xl sm:text-2xl font-black text-sumi">{value}</div>
                            <div className="text-[10px] font-bold text-sumi-muted uppercase tracking-widest mt-0.5">
                                {label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Divider ── */}
            <div className="max-w-4xl mx-auto px-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: accentColor }} />
                    <h2 className="text-sm font-bold text-sumi uppercase tracking-widest">
                        Semua Artikel
                    </h2>
                    <div className="flex-1 h-[0.5px] bg-sumi-10" />
                </div>
            </div>

            {/* ── Grid artikel ── */}
            <div className="max-w-4xl mx-auto px-6 pb-20">
                {loosePosts.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-sumi-10 rounded-2xl">
                        <p className="text-sumi-muted text-sm font-medium">
                            Belum ada artikel yang dipublikasikan.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {loosePosts.map((post) => (
                            <PostCard
                                key={post.id}
                                slug={post.slug}
                                title={post.title}
                                tags={post.tags}
                                excerpt={`Catatan dari ${user.name || handle} tentang ${post.title.toLowerCase()}...`}
                                author={user.name || handle}
                                date={new Intl.DateTimeFormat("id-ID", {
                                    day: "numeric", month: "short", year: "numeric",
                                }).format(new Date(post.updatedAt))}
                                readTime="5 min"
                            />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}