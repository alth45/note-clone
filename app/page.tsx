import { Suspense } from "react";
import Hero from "@/components/home/Hero";
import TimelineSidebar from "@/components/home/TimelineSidebar";
import CategoryFilter from "@/components/home/CategoryFilter";
import PostCard from "@/components/ui/PostCard";
import PostRecommendation from "@/components/home/PostRecommendation";
import MobileExploreMenu from "@/components/home/MobileExploreMenu";
import HomeFeedTabs from "@/components/home/HomeFeedTabs";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getAllTags() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { tags: true },
  });
  const freq = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const t = tag.trim();
      if (t) freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag: activeTag } = await searchParams;

  const [allPosts, allTags, folders] = await Promise.all([
    prisma.post.findMany({
      where: { published: true },
      include: { author: true },
      orderBy: { updatedAt: "desc" },
    }),
    getAllTags(),
    prisma.folder.findMany({
      include: {
        _count: { select: { posts: { where: { published: true } } } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeFolders = folders.filter((f) => f._count.posts > 0);

  const filteredPosts = activeTag
    ? allPosts.filter((p) =>
      p.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase())
    )
    : allPosts;

  const loosePosts = filteredPosts.filter((p) => p.folderId === null);
  const showFolders = !activeTag;

  return (
    <div className="flex flex-col gap-12 pb-12">
      <MobileExploreMenu />
      <Hero />

      <section className="flex flex-col md:flex-row gap-8 lg:gap-2 relative">
        <TimelineSidebar posts={allPosts} />

        <div className="flex-1 overflow-hidden">

          {/* ── Tab bar: Terbaru / Following ── */}
          <HomeFeedTabs
            allTagsNode={
              <Suspense fallback={
                <div className="h-8 bg-sumi-10/50 rounded-full w-64 animate-pulse" />
              }>
                <CategoryFilter
                  tags={allTags}
                  activeTag={activeTag ?? null}
                />
              </Suspense>
            }
            allFeedNode={
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mr-2">
                {showFolders && activeFolders.length === 0 && loosePosts.length === 0 ? (
                  <div className="col-span-full py-10 text-center border border-dashed border-sumi-10 rounded-2xl bg-washi-dark/30">
                    <p className="text-sumi-muted text-sm font-medium">
                      Belum ada artikel yang dipublikasikan.
                    </p>
                  </div>
                ) : loosePosts.length === 0 && activeTag ? (
                  <div className="col-span-full py-10 text-center border border-dashed border-sumi-10 rounded-2xl bg-washi-dark/30">
                    <p className="text-sumi-muted text-sm font-medium">
                      Tidak ada artikel dengan tag <strong>#{activeTag}</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    {showFolders && activeFolders.map((folder) => (
                      <PostCard
                        key={`folder-${folder.id}`}
                        isFolder
                        postCount={folder._count.posts}
                        slug={folder.id}
                        title={folder.name}
                      />
                    ))}
                    {loosePosts.map((post) => (
                      <PostCard
                        key={post.id}
                        slug={post.slug}
                        title={post.title}
                        tags={post.tags}
                        excerpt={`Catatan dan eksplorasi terbaru mengenai ${post.title.toLowerCase()}...`}
                        author={post.author?.name || "Penulis Misterius"}
                        date={new Intl.DateTimeFormat("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        }).format(new Date(post.updatedAt))}
                        readTime="5 min"
                      />
                    ))}
                  </>
                )}
              </div>
            }
            activeTag={activeTag ?? null}
          />
        </div>

        <PostRecommendation posts={allPosts} />
      </section>
    </div>
  );
}