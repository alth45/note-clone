import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getExploreData() {
    const allPosts = await prisma.post.findMany({
        where: { published: true },
        orderBy: { views: "desc" },
        take: 40,
        select: {
            id: true,
            title: true,
            slug: true,
            views: true,
            coverImage: true,
            tags: true,
            updatedAt: true,
            author: { select: { name: true } },
        },
    });

    // Trending: top 10 by views
    const trending = allPosts.slice(0, 10);

    // Terbaru: sorted by updatedAt, exclude yang sudah di trending
    const trendingIds = new Set(trending.map(p => p.id));
    const terbaru = [...allPosts]
        .filter(p => !trendingIds.has(p.id))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10);

    return { trending, terbaru };
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=600&auto=format&fit=crop";

export default async function ExplorePage() {
    const { trending, terbaru } = await getExploreData();

    const categories = [
        { label: "Trending & Viral", items: trending },
        ...(terbaru.length > 0 ? [{ label: "Terbaru", items: terbaru }] : []),
    ];

    return (
        <div className="min-h-screen bg-washi text-sumi pb-12">

            {/* Header */}
            <div className="sticky top-0 z-50 flex items-center gap-4 px-4 py-4 md:px-8 border-b border-sumi-10 bg-washi/90 backdrop-blur-md">
                <Link
                    href="/"
                    className="p-2 rounded-full bg-washi-dark border border-sumi-10 text-sumi-muted hover:text-sumi transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex items-center gap-3">
                    <span className="bg-sumi text-washi px-2 py-0.5 rounded-md font-black text-lg leading-none tracking-tighter">E</span>
                    <h1 className="text-lg font-bold tracking-tight">Eksplorasi Konten</h1>
                </div>
            </div>

            {/* Konten */}
            <div className="p-4 md:p-8 pt-6 md:pt-10 overflow-hidden">
                {categories.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-sumi-10 rounded-2xl">
                        <p className="text-sumi-muted text-sm">Belum ada artikel yang dipublikasikan.</p>
                    </div>
                ) : (
                    categories.map((category, index) => (
                        <div key={index} className="mb-8 last:mb-2">

                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base md:text-xl font-bold text-sumi">
                                    {category.label}
                                </h2>
                                <span className="text-xs text-sumi-muted">
                                    {category.items.length} artikel
                                </span>
                            </div>

                            <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-hide">
                                {category.items.map((post) => (
                                    <Link
                                        href={`/post/${post.slug}`}
                                        key={post.id}
                                        className="group shrink-0 w-[240px] md:w-[280px] snap-start relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(28,28,30,0.12)] bg-washi-dark border border-sumi-10 flex flex-col"
                                    >
                                        <div className="aspect-video w-full relative border-b border-sumi-10">
                                            <img
                                                src={post.coverImage || FALLBACK_IMAGE}
                                                alt={post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-sumi/5 group-hover:bg-transparent transition-colors" />
                                        </div>

                                        <div className="p-3 bg-washi group-hover:bg-washi-dark transition-colors flex-1 flex flex-col justify-between">
                                            <h3 className="font-bold text-sm text-sumi line-clamp-2 leading-snug">
                                                {post.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-sumi-muted">
                                                <span className="text-emerald-600 flex items-center gap-1">
                                                    <Eye size={10} /> {(post.views || 0).toLocaleString("id-ID")} dilihat
                                                </span>
                                                {post.author?.name && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="truncate">{post.author.name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}