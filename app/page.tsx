import Hero from "@/components/home/Hero";
import TimelineSidebar from "@/components/home/TimelineSidebar";
import CategoryFilter from "@/components/home/CategoryFilter";
import PostCard from "@/components/ui/PostCard";
import PostRecommendation from "@/components/home/PostRecommendation";
import MobileExploreMenu from "@/components/home/MobileExploreMenu";
import prisma from "@/lib/prisma";

const dynamicCategories = [
  { name: "Semua", active: true },
  { name: "Tech", active: false },
  { name: "Programming", active: false },
  { name: "AI & Data", active: false },
  { name: "Komputer", active: false },
  { name: "Sains", active: false },
  { name: "Otomotif", active: false },
];

export const dynamic = 'force-dynamic'

export default async function Home() {

  // 1. Tarik SEMUA artikel yang SUDAH PUBLISH buat disetor ke Sidebar
  const allPosts = await prisma.post.findMany({
    where: { published: true },
    include: { author: true },
    orderBy: { updatedAt: 'desc' }
  });

  // 2. Pisahkan artikel lepas (yang folderId-nya null / nggak ada foldernya)
  const loosePosts = allPosts.filter(post => post.folderId === null);

  // 3. Tarik data Folder (Playlist) yang ada isinya (minimal 1 artikel publish)
  const folders = await prisma.folder.findMany({
    include: {
      _count: {
        select: { posts: { where: { published: true } } }
      }
    },
    orderBy: { name: 'asc' }
  });
  const activeFolders = folders.filter(f => f._count.posts > 0);

  return (
    <div className="flex flex-col gap-12 pb-12">

      <MobileExploreMenu />

      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Main Content Layout */}
      <section className="flex flex-col md:flex-row gap-8 lg:gap-2 relative">

        {/* Sidebar Kiri - Tetep dapet SEMUA postingan biar timeline-nya komplit */}
        <TimelineSidebar posts={allPosts} />

        {/* Konten Kanan */}
        <div className="flex-1 overflow-hidden">

          {/* Header & Filter */}
          <div className="flex flex-col gap-4 mb-8">
            <h2 className="text-xl font-bold text-sumi">Terbaru</h2>
            <CategoryFilter categories={dynamicCategories} />
          </div>

          {/* Grid Artikel & Playlist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mr-2">

            {/* KALAU DATABASENYA BENER-BENER KOSONG */}
            {activeFolders.length === 0 && loosePosts.length === 0 ? (
              <div className="col-span-full py-10 text-center border border-dashed border-sumi-10 rounded-2xl bg-washi-dark/30">
                <p className="text-sumi-muted text-sm font-medium">Belum ada artikel yang dipublikasikan.</p>
              </div>
            ) : (
              <>
                {/* 1. RENDER PLAYLIST / FOLDER DULUAN */}
                {activeFolders.map((folder) => (
                  <PostCard
                    key={`folder-${folder.id}`}
                    isFolder={true} // Aktifin mode Playlist
                    postCount={folder._count.posts} // Lempar jumlah artikel
                    slug={folder.id} // Sementara pakai ID biar aman buat rute /folder/[id]
                    title={folder.name}
                  />
                ))}

                {/* 2. RENDER ARTIKEL LEPAS DI BAWAHNYA */}
                {loosePosts.map((post) => (
                  <PostCard
                    key={post.id}
                    isFolder={false} // Mode artikel biasa
                    slug={post.slug}
                    title={post.title}
                    excerpt={`Catatan dan eksplorasi terbaru mengenai ${post.title.toLowerCase()}...`}
                    author={post.author?.name || "Penulis Misterius"}
                    date={new Intl.DateTimeFormat('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    }).format(new Date(post.updatedAt))}
                    readTime="5 min"
                  />
                ))}
              </>
            )}

          </div>

        </div>

        {/* Rekomendasi Kanan - Tetep dapet SEMUA postingan */}
        <PostRecommendation posts={allPosts} />
      </section>
    </div>
  );
}