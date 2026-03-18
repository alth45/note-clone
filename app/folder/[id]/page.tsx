import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers, Folder as FolderIcon } from "lucide-react";
import prisma from "@/lib/prisma";
import PostCard from "@/components/ui/PostCard"; // Sesuaikan path-nya

// --- MESIN WARNA BIAR SAMA KAYAK DI BERANDA ---
function getReadableColorStyles(slug: string) {
    const palette = [
        { bg: "#4A5568", text: "#FFFFFF" }, { bg: "#718096", text: "#FFFFFF" },
        { bg: "#2C7A7B", text: "#FFFFFF" }, { bg: "#4C51BF", text: "#FFFFFF" },
        { bg: "#C53030", text: "#FFFFFF" }, { bg: "#B7791F", text: "#FFFFFF" },
        { bg: "#2F855A", text: "#FFFFFF" }, { bg: "#2B6CB0", text: "#FFFFFF" },
        { bg: "#97266D", text: "#FFFFFF" },
    ];
    let hash = 0;
    for (let i = 0; i < slug.length; i++) hash = slug.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
}

// Supaya selalu narik data terbaru pas ada yang baru di-push dari terminal
export const revalidate = 0;

export default async function FolderPage({ params }: { params: { id: string } }) {

    // 1. Tarik data folder beserta isi artikelnya yang udah LIVE
    const folder = await prisma.folder.findUnique({
        where: { id: params.id },
        include: {
            posts: {
                where: { published: true },
                include: { author: true },
                orderBy: { updatedAt: 'desc' } // Yang terbaru di atas
            }
        }
    });

    // Kalau foldernya gak ada atau ID-nya ngasal, lempar ke halaman 404
    if (!folder) {
        notFound();
    }

    const colorStyles = getReadableColorStyles(folder.id);

    return (
        <main className="min-h-screen bg-washi pt-24 pb-20">
            <div className="max-w-5xl mx-auto px-6">

                {/* --- TOMBOL KEMBALI --- */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-sumi-muted hover:text-sumi transition-colors mb-8"
                >
                    <ArrowLeft size={16} /> Kembali ke Beranda
                </Link>

                {/* --- HEADER PLAYLIST ALA YOUTUBE --- */}
                <header
                    className="w-full rounded-3xl overflow-hidden shadow-lg mb-12 relative flex flex-col md:flex-row items-center md:items-stretch"
                    style={{ backgroundColor: colorStyles.bg }}
                >
                    {/* Sisi Kiri: Ikon Gede & Nama Playlist */}
                    <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative z-10">
                        <div className="flex items-center gap-2 mb-4" style={{ color: colorStyles.text, opacity: 0.8 }}>
                            <FolderIcon size={18} />
                            <span className="text-sm font-bold uppercase tracking-widest">Playlist Catatan</span>
                        </div>
                        <h1
                            className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight drop-shadow-sm mb-4"
                            style={{ color: colorStyles.text }}
                        >
                            {folder.name}
                        </h1>
                        <p style={{ color: colorStyles.text, opacity: 0.9 }}>
                            Koleksi artikel dan catatan yang dikelompokkan dalam satu tempat.
                        </p>
                    </div>

                    {/* Sisi Kanan: Info Jumlah Item (Panel Gelap) */}
                    <div className="w-full md:w-64 bg-black/20 backdrop-blur-sm p-8 flex flex-row md:flex-col items-center justify-center gap-4 border-t md:border-t-0 md:border-l border-white/10" style={{ color: colorStyles.text }}>
                        <div className="flex flex-col items-center justify-center">
                            <span className="text-4xl font-black">{folder.posts.length}</span>
                            <span className="text-xs uppercase tracking-widest opacity-80 mt-1">Artikel</span>
                        </div>
                        <div className="hidden md:block w-12 h-[1px] bg-white/20 my-2"></div>
                        <Layers size={32} className="opacity-80" />
                    </div>

                    {/* Hiasan Ikon Background */}
                    <div className="absolute -bottom-10 -left-10 opacity-10 rotate-12 pointer-events-none">
                        <FolderIcon size={200} color={colorStyles.text} />
                    </div>
                </header>

                {/* --- GRID ISI ARTIKEL (PLAYLIST CONTENT) --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {folder.posts.length === 0 ? (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-sumi-10 rounded-3xl">
                            <p className="text-sumi-muted font-medium">Playlist ini masih kosong.</p>
                            <p className="text-sm text-sumi-light mt-2">Gunakan terminal: <code className="bg-sumi-10 text-sumi px-2 py-1 rounded">ntc mv &lt;slug&gt; "{folder.name}"</code></p>
                        </div>
                    ) : (
                        folder.posts.map((post) => (
                            <PostCard
                                key={post.id}
                                isFolder={false} // Mode artikel standar
                                slug={post.slug}
                                title={post.title}
                                excerpt={`Catatan detail mengenai ${post.title.toLowerCase()}...`}
                                author={post.author?.name || "Penulis Misterius"}
                                date={new Intl.DateTimeFormat('id-ID', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                }).format(new Date(post.updatedAt))}
                                readTime="5 min"
                            />
                        ))
                    )}
                </div>

            </div>
        </main>
    );
}