import { ChevronLeft, ChevronRight, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Simulasi Data Kalender untuk Februari 2026
const februaryData = Array.from({ length: 28 }, (_, i) => {
    const date = i + 1;
    let posts = 0;
    let image = null;
    let slug = null;

    // Data postingan dummy sesuai tanggal
    if (date === 10) {
        posts = 1;
        image = "https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=400&auto=format&fit=crop";
        slug = "evolusi-kendaraan-listrik";
    }
    if (date === 15) {
        posts = 2;
        image = "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=400&auto=format&fit=crop";
        slug = "merakit-ekosistem-komputer";
    }
    if (date === 20) {
        posts = 1;
        image = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=400&auto=format&fit=crop";
        slug = "revolusi-data-dan-ai";
    }
    if (date === 24) {
        posts = 3;
        image = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop";
        slug = "arsitektur-sistem-terdistribusi";
    }

    return { date, posts, image, slug };
});

const daysOfWeek = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function CalendarPage() {
    return (
        <div className="min-h-screen bg-washi px-4 py-8 md:p-12 max-w-4xl mx-auto">

            {/* --- HEADER HALAMAN --- */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-sumi-10">
                {/* Tombol Back ke Home */}
                <Link
                    href="/"
                    className="p-2 rounded-full text-sumi-muted hover:text-sumi hover:bg-sumi/10 transition-colors bg-washi border border-sumi-10 shadow-sm"
                >
                    <ArrowLeft size={20} />
                </Link>

                {/* Kontrol Bulan */}
                <div className="flex items-center gap-2 md:gap-4">
                    <button className="p-2 hover:bg-sumi/5 rounded-full transition-colors text-sumi-muted hover:text-sumi">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-sumi">Februari 2026</h1>
                    <button className="p-2 hover:bg-sumi/5 rounded-full transition-colors text-sumi-muted hover:text-sumi">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Spacer transparan biar flex justify-between nya tetap di tengah */}
                <div className="w-10"></div>
            </div>

            {/* --- AREA GRID KALENDER --- */}
            <div className="bg-washi">

                {/* Baris Nama Hari */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {daysOfWeek.map((day, idx) => (
                        <div key={idx} className="text-center text-[10px] md:text-xs font-bold text-sumi-muted uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid Tanggal */}
                <div className="grid grid-cols-7 gap-2 md:gap-3">
                    {februaryData.map((day) => {
                        const hasPosts = day.posts > 0;

                        // Konten dalam setiap kotak tanggal (Biar kodenya nggak berulang)
                        const CardContent = (
                            <>
                                {/* Background Gambar jika ada postingan */}
                                {hasPosts && day.image && (
                                    <>
                                        <img
                                            src={day.image}
                                            alt={`Posts on Feb ${day.date}`}
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                                        />
                                        <div className="absolute inset-0 bg-sumi/60 group-hover:bg-sumi/50 transition-colors" />
                                    </>
                                )}

                                {/* Angka Tanggal */}
                                <span className={`relative z-10 text-base md:text-xl font-bold leading-none ${hasPosts ? "text-washi" : "text-sumi-muted/60"}`}>
                                    {day.date}
                                </span>

                                {/* Info Jumlah Postingan */}
                                {hasPosts && (
                                    <div className="relative z-10 flex items-center gap-1 text-washi">
                                        <FileText size={10} className="opacity-80" />
                                        <span className="text-[9px] md:text-xs font-bold tracking-wide">
                                            {day.posts}
                                            <span className="hidden md:inline"> POST</span>
                                        </span>
                                    </div>
                                )}
                            </>
                        );

                        // Styling dasar kotak
                        const cardClasses = `group relative aspect-square rounded-xl overflow-hidden flex flex-col justify-between p-2 md:p-3 transition-all duration-300 ${hasPosts
                                ? "cursor-pointer shadow-sm hover:shadow-lg hover:scale-[1.05] z-10 border border-sumi-10"
                                : "bg-washi border border-sumi-10/50"
                            }`;

                        // Kalau ada post, bungkus pakai Link ke halaman artikel
                        if (hasPosts && day.slug) {
                            return (
                                <Link href={`/post/${day.slug}`} key={day.date} className={cardClasses}>
                                    {CardContent}
                                </Link>
                            );
                        }

                        // Kalau nggak ada post, biarin jadi div biasa (nggak bisa diklik)
                        return (
                            <div key={day.date} className={cardClasses}>
                                {CardContent}
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}