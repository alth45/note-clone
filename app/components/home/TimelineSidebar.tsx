"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";

// Kita terima 'posts' dari halaman Beranda (page.tsx)
export default function TimelineSidebar({ posts = [] }: { posts?: any[] }) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // State buat ngatur bulan apa yang lagi dilihat
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const currentMonthName = monthNames[month];

    // Logika Kalender Dinamis
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Minggu) - 6 (Sabtu)

    // Cocokin data dari PostgreSQL ke tanggal kalender
    const calendarData = Array.from({ length: daysInMonth }, (_, i) => {
        const date = i + 1;

        // Cari post yang di-publish pada tanggal & bulan ini
        const dayPosts = posts.filter(post => {
            const postDate = new Date(post.createdAt || post.updatedAt);
            return postDate.getDate() === date && postDate.getMonth() === month && postDate.getFullYear() === year;
        });

        const postsCount = dayPosts.length;

        // Ambil gambar cover pertama kalau ada, kalau nggak pakai fallback estetik lu
        const image = postsCount > 0 ? (dayPosts[0].coverImage || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop") : null;

        // Ambil slug buat link
        const slug = postsCount > 0 ? dayPosts[0].slug : null;

        return { date, posts: postsCount, image, slug };
    });

    // Hitung total post di bulan yang lagi dilihat
    const totalPostsThisMonth = calendarData.reduce((acc, curr) => acc + curr.posts, 0);

    const daysOfWeek = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

    // Fungsi Navigasi Bulan
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

    return (
        <>
            {/* --- SIDEBAR TIMELINE (KIRI) --- */}
            <aside className="hidden md:block w-32 lg:w-40 shrink-0 relative z-10">
                <div className="sticky top-28">
                    <h3 className="text-xs font-bold text-sumi-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                        <CalendarIcon size={14} /> Timeline
                    </h3>

                    <div className="relative border-l border-sumi-10 ml-1.5 space-y-8">
                        {/* Item Aktif (Bisa Diklik buat buka Kalender) */}
                        <div
                            onClick={() => setIsCalendarOpen(true)}
                            className="relative pl-5 group cursor-pointer"
                        >
                            <div className="absolute -left-[4px] top-1.5 w-2 h-2 rounded-full bg-sumi group-hover:scale-150 transition-transform shadow-[0_0_10px_rgba(28,28,30,0.5)]"></div>
                            {/* Nama Bulan & Tahun Dinamis */}
                            <p className="text-sm font-bold text-sumi group-hover:text-sumi-light transition-colors">{currentMonthName}</p>
                            <p className="text-xs text-sumi-muted mt-1 group-hover:text-sumi transition-colors">{totalPostsThisMonth} Postingan</p>
                            <p className="text-[9px] text-sumi-muted/50 mt-1 uppercase tracking-widest hidden group-hover:block animate-in fade-in">Lihat Kalender</p>
                        </div>

                        {/* Item Pasif (Bulan Lalu) */}
                        <div
                            onClick={prevMonth} // Kita bikin bisa diklik buat mundur bulan!
                            className="relative pl-5 group cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                        >
                            <div className="absolute -left-[4px] top-1.5 w-2 h-2 rounded-full border-2 border-sumi bg-washi transition-colors"></div>
                            <p className="text-sm font-medium text-sumi-muted transition-colors">{month === 0 ? "Desember" : monthNames[month - 1]}</p>
                            <p className="text-[9px] text-sumi-muted mt-1 uppercase tracking-widest">Sebelumnya</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- POPUP KALENDER VISUAL --- */}
            {isCalendarOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-sumi/30 backdrop-blur-md z-[110] transition-opacity"
                        onClick={() => setIsCalendarOpen(false)}
                    />

                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl bg-washi text-sumi rounded-2xl shadow-2xl z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-sumi-10">

                        {/* Header Modal Kalender */}
                        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-sumi-10 bg-washi-dark/50">
                            <div className="flex items-center gap-4">
                                <button onClick={prevMonth} className="p-2 hover:bg-sumi/5 rounded-full transition-colors text-sumi-muted hover:text-sumi">
                                    <ChevronLeft size={20} />
                                </button>
                                <h2 className="text-xl md:text-2xl font-bold tracking-tight">{currentMonthName} {year}</h2>
                                <button onClick={nextMonth} className="p-2 hover:bg-sumi/5 rounded-full transition-colors text-sumi-muted hover:text-sumi">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                            <button
                                onClick={() => setIsCalendarOpen(false)}
                                className="p-2 rounded-full text-sumi-muted hover:text-sumi hover:bg-sumi/10 transition-colors bg-washi border border-sumi-10 shadow-sm"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Area Grid Kalender */}
                        <div className="p-6 md:p-8 bg-washi">

                            {/* Baris Nama Hari */}
                            <div className="grid grid-cols-7 gap-2 mb-4">
                                {daysOfWeek.map((day, idx) => (
                                    <div key={idx} className="text-center text-xs font-bold text-sumi-muted uppercase tracking-widest">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Grid Tanggal */}
                            <div className="grid grid-cols-7 gap-2 md:gap-3">

                                {/* Kotak Kosong buat nyesuain hari pertama bulan ini */}
                                {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                                    <div key={`blank-${idx}`} className="aspect-square opacity-0"></div>
                                ))}

                                {/* Render Tanggal Asli */}
                                {calendarData.map((day) => {
                                    const hasPosts = day.posts > 0;

                                    return (
                                        <div
                                            key={day.date}
                                            className={`
                                                group relative aspect-square rounded-xl overflow-hidden flex flex-col justify-between p-2 md:p-3 transition-all duration-300
                                                ${hasPosts
                                                    ? "cursor-pointer shadow-sm hover:shadow-lg hover:scale-[1.05] z-10 border border-sumi-10"
                                                    : "bg-washi border border-sumi-10/50"
                                                }
                                            `}
                                        >
                                            {/* Kalau ada gambar & postingan, tampilin background */}
                                            {hasPosts && day.image && (
                                                <>
                                                    {/* PENTING: Link ini gua arahin ke /read/ ya, sesuai rute lu kemarin */}
                                                    <Link href={`/read/${day.slug}`}>
                                                        <img
                                                            src={day.image}
                                                            alt={`Posts on ${day.date} ${currentMonthName}`}
                                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                                                        />
                                                        <div className="absolute inset-0 bg-sumi/60 group-hover:bg-sumi/50 transition-colors" />
                                                    </Link>
                                                </>
                                            )}

                                            {/* Angka Tanggal */}
                                            <span className={`
                                                relative z-10 text-lg md:text-xl font-bold leading-none
                                                ${hasPosts ? "text-washi" : "text-sumi-muted/60"}
                                            `}>
                                                {day.date}
                                            </span>

                                            {/* Info Jumlah Postingan */}
                                            {hasPosts && (
                                                <div className="relative z-10 flex items-center gap-1.5 text-washi">
                                                    <FileText size={12} className="opacity-80" />
                                                    <span className="text-[10px] md:text-xs font-bold tracking-wide">
                                                        {day.posts} POST
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                        </div>
                    </div>
                </>
            )}
        </>
    );
}