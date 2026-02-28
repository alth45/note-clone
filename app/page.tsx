import Hero from "@/components/home/Hero";
import TimelineSidebar from "@/components/home/TimelineSidebar";
import CategoryFilter from "@/components/home/CategoryFilter";
import PostCard from "@/components/ui/PostCard";
import PostRecommendation from "@/components/home/PostRecommendation";
import MobileExploreMenu from "@/components/home/MobileExploreMenu";
import prisma from "@/lib/prisma"; // Pastikan import prisma-nya pakai kurung kurawal ya

const dynamicCategories = [
  { name: "Semua", active: true },
  { name: "Tech", active: false },
  { name: "Programming", active: false },
  { name: "AI & Data", active: false },
  { name: "Komputer", active: false },
  { name: "Sains", active: false },
  { name: "Otomotif", active: false },
];

export default async function Home() {
  // 1. Tarik artikel yang SUDAH PUBLISH dari PostgreSQL
  const posts = await prisma.post.findMany({
    where: {
      published: true
    },
    include: {
      author: true // Tarik data relasi user yang nulis
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return (
    <div className="flex flex-col gap-12 pb-12">

      <MobileExploreMenu />

      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Main Content Layout */}
      <section className="flex flex-col md:flex-row gap-8 lg:gap-2 relative">

        {/* Sidebar Kiri */}
        <TimelineSidebar posts={posts} />

        {/* Konten Kanan */}
        <div className="flex-1 overflow-hidden">

          {/* Header & Filter */}
          <div className="flex flex-col gap-4 mb-8">
            <h2 className="text-xl font-bold text-sumi">Terbaru</h2>
            <CategoryFilter categories={dynamicCategories} />
          </div>

          {/* Grid Artikel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mr-2">

            {/* KALAU KOSONG, TAMPILIN INI */}
            {posts.length === 0 ? (
              <div className="col-span-full py-10 text-center border border-dashed border-sumi-10 rounded-2xl bg-washi-dark/30">
                <p className="text-sumi-muted text-sm font-medium">Belum ada artikel yang dipublikasikan.</p>
              </div>
            ) : (
              // KALAU ADA ISINYA, MAP DATA DARI DATABASE
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  slug={post.slug}
                  title={post.title}

                  // Karena konten asli JSON Tiptap susah dibaca mentah, kita kasih teks potong sementara
                  excerpt={`Catatan dan eksplorasi terbaru mengenai ${post.title.toLowerCase()}...`}

                  // Ambil nama dari relasi tabel User
                  author={post.author?.name || "Penulis Misterius"}

                  // Format tanggal otomatis ke gaya Indonesia (Misal: 24 Feb 2026)
                  date={new Intl.DateTimeFormat('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  }).format(new Date(post.updatedAt))}

                  readTime="5 min" // Nanti ini bisa kita bikin fungsi hitung kata

                  // Kalau dia belum upload cover, kasih gambar default estetik
                  image={post.coverImage || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop"}
                />
              ))
            )}

          </div>

        </div>

        <PostRecommendation posts={posts} />
      </section>
    </div>
  );
}