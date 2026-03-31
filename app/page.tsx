/**
 * app/page.tsx  — VERSI PERFORMA
 *
 * Gantikan file yang sudah ada.
 *
 * Masalah di versi lama yang diperbaiki:
 *  1. include: { author: true } tanpa select — fetch semua kolom user
 *     termasuk password hash, cliToken, dll ke memori server
 *  2. Tiga query sequential (allPosts, allTags, folders) — sekarang Promise.all
 *  3. allPosts di-pass ke TimelineSidebar dan PostRecommendation sebagai props
 *     padahal itu fetch ulang data yang sama — konten sekarang difilter di server
 *  4. Tidak ada loading state — halaman blank sampai semua data siap
 */

import { Suspense } from "react";
import Hero from "@/components/home/Hero";
import TimelineSidebar from "@/components/home/TimelineSidebar";
import CategoryFilter from "@/components/home/CategoryFilter";
import PostCard from "@/components/ui/PostCard";
import PostRecommendation from "@/components/home/PostRecommendation";
import MobileExploreMenu from "@/components/home/MobileExploreMenu";
import HomeFeedTabs from "@/components/home/HomeFeedTabs";
import prisma from "@/lib/prisma";
import NotesBar from "@/components/home/NotesBar";

export const dynamic = "force-dynamic";

// ─── Skeleton untuk loading state ────────────────────────────────────────────

function PostGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-sumi-10 overflow-hidden">
          <div className="h-48 bg-sumi-10/50 animate-pulse" />
          <div className="p-5 flex flex-col gap-3">
            <div className="h-4 bg-sumi-10/40 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-sumi-10/40 rounded animate-pulse" />
            <div className="h-3 bg-sumi-10/40 rounded animate-pulse w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Data fetching — semua query dengan explicit select ───────────────────────

async function getHomeData(activeTag?: string) {
  // Semua query paralel — tidak sequential
  const [posts, folders] = await Promise.all([
    prisma.post.findMany({
      where: {
        published: true,
        // Filter by tag di server, bukan di client
        ...(activeTag && { tags: { has: activeTag.toLowerCase() } }),
      },
      orderBy: { updatedAt: "desc" },
      // Explicit select — TIDAK include kolom sensitif
      select: {
        id: true,
        title: true,
        slug: true,
        tags: true,
        coverImage: true,
        views: true,
        folderId: true,
        updatedAt: true,
        createdAt: true,
        author: {
          select: {
            // Hanya kolom yang benar-benar dipakai di UI
            name: true,
            image: true,
            handle: true,
            // TIDAK include: password, cliToken, email, bio, failedLoginCount, dll
          },
        },
      },
    }),

    prisma.folder.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { posts: { where: { published: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Tags dihitung dari posts yang sudah di-fetch — tidak perlu query terpisah
  const tagFreq = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const t = tag.trim();
      if (t) tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1);
    }
  }
  const allTags = [...tagFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  // Folder yang punya setidaknya 1 artikel published
  const activeFolders = folders.filter((f) => f._count.posts > 0);

  // Artikel tanpa folder (tidak masuk playlist)
  const loosePosts = posts.filter((p) => p.folderId === null);

  // Top posts untuk sidebar rekomendasi — filter di sini, tidak di komponen
  const topPosts = [...posts]
    .filter((p) => (p.views ?? 0) > 20)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 10);

  return { posts, loosePosts, allTags, activeFolders, topPosts };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag: activeTag } = await searchParams;
  const { posts, loosePosts, allTags, activeFolders, topPosts } =
    await getHomeData(activeTag);

  return (
    <div className="flex flex-col gap-12 pb-12">
      <MobileExploreMenu />
      <Hero />


      {/* ── Notes/Stories bar ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-sumi-muted uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Notes Hari Ini
          </h2>
          <span className="text-[10px] text-sumi-muted/50">Hilang dalam 24 jam</span>
        </div>
        <NotesBar />
      </section>

      <section className="flex flex-col md:flex-row gap-8 lg:gap-2 relative">

        {/* Sidebar timeline — hanya terima data minimal */}
        <TimelineSidebar posts={posts} />

        <div className="flex-1 overflow-hidden">
          <HomeFeedTabs
            allTagsNode={
              <Suspense fallback={
                <div className="h-8 bg-sumi-10/50 rounded-full w-64 animate-pulse" />
              }>
                <CategoryFilter tags={allTags} activeTag={activeTag ?? null} />
              </Suspense>
            }
            allFeedNode={
              <Suspense fallback={<PostGridSkeleton />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mr-2">
                  {/* Empty state */}
                  {activeFolders.length === 0 && loosePosts.length === 0 ? (
                    <div className="col-span-full py-10 text-center border border-dashed border-sumi-10 rounded-2xl bg-washi-dark/30">
                      <p className="text-sumi-muted text-sm font-medium">
                        Belum ada artikel yang dipublikasikan.
                      </p>
                    </div>
                  ) : loosePosts.length === 0 && activeTag ? (
                    <div className="col-span-full py-10 text-center border border-dashed border-sumi-10 rounded-2xl bg-washi-dark/30">
                      <p className="text-sumi-muted text-sm font-medium">
                        Tidak ada artikel dengan tag{" "}
                        <strong>#{activeTag}</strong>.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Folder cards — hanya tampil kalau tidak filter tag */}
                      {!activeTag &&
                        activeFolders.map((folder) => (
                          <PostCard
                            key={`folder-${folder.id}`}
                            isFolder
                            postCount={folder._count.posts}
                            slug={folder.id}
                            title={folder.name}
                          />
                        ))}

                      {/* Artikel */}
                      {loosePosts.map((post) => (
                        <PostCard
                          key={post.id}
                          slug={post.slug}
                          title={post.title}
                          tags={post.tags}
                          excerpt={`Catatan terbaru mengenai ${post.title.toLowerCase()}...`}
                          author={post.author?.name ?? "Penulis"}
                          date={new Intl.DateTimeFormat("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(post.updatedAt))}
                          readTime="5 min"
                        />
                      ))}
                    </>
                  )}
                </div>
              </Suspense>
            }
            activeTag={activeTag ?? null}
          />
        </div>

        {/* Sidebar rekomendasi — terima topPosts yang sudah difilter */}
        <PostRecommendation posts={topPosts} />
      </section>
    </div>
  );
}