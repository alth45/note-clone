import Link from "next/link";
import { PlayCircle, Info, ArrowLeft } from "lucide-react";

// Data Dummy Pop-up (Gaya Netflix)
const modalData = [
    {
        category: "Trending di Tech",
        items: [
            { id: "n1", title: "Evolusi TypeScript 5.0", image: "https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=600&auto=format&fit=crop" },
            { id: "n2", title: "Menguasai PostgreSQL", image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=600&auto=format&fit=crop" },
            { id: "n3", title: "Membangun SaaS", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop" },
            { id: "n4", title: "Keamanan API", image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop" },
            { id: "n5", title: "Microservices", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop" },
        ]
    },
    {
        category: "Eksplorasi Budaya & Visual",
        items: [
            { id: "n6", title: "Senja di Kamakura", image: "https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?q=80&w=600&auto=format&fit=crop" },
            { id: "n7", title: "Arsitektur Aoyama", image: "https://images.unsplash.com/photo-1493904447285-f642466710b1?q=80&w=600&auto=format&fit=crop" },
            { id: "n8", title: "Desain UI Minimalis", image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=600&auto=format&fit=crop" },
            { id: "n9", title: "Estetika Wabi-Sabi", image: "https://images.unsplash.com/photo-1615529328331-f8917597711f?q=80&w=600&auto=format&fit=crop" },
            { id: "n10", title: "Tipografi Jepang", image: "https://images.unsplash.com/photo-1528310901877-446777cda654?q=80&w=600&auto=format&fit=crop" },
        ]
    }
];

export default function ExplorePage() {
    return (
        <div className="min-h-screen bg-washi text-sumi pb-12">

            {/* --- HEADER HALAMAN (Sticky di atas) --- */}
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

            {/* --- AREA KONTEN (Slider Horizontal) --- */}
            <div className="p-4 md:p-8 pt-6 md:pt-10 overflow-hidden">
                {modalData.map((category, index) => (
                    <div key={index} className="mb-8 last:mb-2">

                        {/* Judul Kategori */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base md:text-xl font-bold text-sumi">
                                {category.category}
                            </h2>
                            <span className="text-xs text-sumi-muted font-normal hover:text-sumi cursor-pointer transition-colors">
                                Lihat Semua
                            </span>
                        </div>

                        {/* Slider Horizontal ala Netflix */}
                        <div className="flex overflow-x-auto gap-4 pb-4 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {category.items.map((item) => (
                                <Link
                                    href={`/post/${item.id}`}
                                    key={item.id}
                                    className="group shrink-0 w-[240px] md:w-[280px] snap-start relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(28,28,30,0.12)] bg-washi-dark border border-sumi-10 flex flex-col"
                                >
                                    {/* Gambar Thumbnail */}
                                    <div className="aspect-video w-full relative border-b border-sumi-10">
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-sumi/5 group-hover:bg-transparent transition-colors" />
                                    </div>

                                    {/* Informasi di Bawah Gambar */}
                                    <div className="p-3 bg-washi group-hover:bg-washi-dark transition-colors flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <PlayCircle size={16} className="text-sumi-muted group-hover:text-sumi transition-colors" />
                                                <Info size={16} className="text-sumi-muted/60 group-hover:text-sumi transition-colors" />
                                            </div>
                                            <h3 className="font-bold text-sm text-sumi line-clamp-1 mt-2">{item.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 text-[10px] md:text-xs font-bold text-sumi-muted">
                                            <span className="text-emerald-600">98% Relevan</span>
                                            <span>•</span>
                                            <span>Topik Baru</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                    </div>
                ))}
            </div>

        </div>
    );
}