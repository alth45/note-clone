import { ChevronLeft, ChevronRight, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const daysOfWeek = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function getMonthName(month: number): string {
    const names = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    return names[month];
}

export default async function CalendarPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string; year?: string }>;
}) {
    const { month: monthParam, year: yearParam } = await searchParams;

    const now = new Date();
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam) : now.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    const daysInMonth = endOfMonth.getDate();
    const firstDayOfMonth = startOfMonth.getDay();

    // Ambil semua artikel published di bulan ini dari DB
    const posts = await prisma.post.findMany({
        where: {
            published: true,
            updatedAt: {
                gte: startOfMonth,
                lte: endOfMonth,
            },
        },
        select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            updatedAt: true,
        },
        orderBy: { updatedAt: "asc" },
    });

    // Kelompokkan artikel per tanggal
    const postsByDay = new Map<number, typeof posts>();
    for (const post of posts) {
        const day = new Date(post.updatedAt).getDate();
        if (!postsByDay.has(day)) postsByDay.set(day, []);
        postsByDay.get(day)!.push(post);
    }

    // Navigasi bulan prev/next
    const prevDate = new Date(year, month - 1, 1);
    const nextDate = new Date(year, month + 1, 1);
    const prevHref = `?month=${prevDate.getMonth()}&year=${prevDate.getFullYear()}`;
    const nextHref = `?month=${nextDate.getMonth()}&year=${nextDate.getFullYear()}`;

    return (
        <div className="min-h-screen bg-washi px-4 py-8 md:p-12 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-sumi-10">
                <Link
                    href="/"
                    className="p-2 rounded-full text-sumi-muted hover:text-sumi hover:bg-sumi/10 transition-colors bg-washi border border-sumi-10 shadow-sm"
                >
                    <ArrowLeft size={20} />
                </Link>

                <div className="flex items-center gap-2 md:gap-4">
                    <Link
                        href={prevHref}
                        className="p-2 hover:bg-sumi/5 rounded-full transition-colors text-sumi-muted hover:text-sumi"
                    >
                        <ChevronLeft size={20} />
                    </Link>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-sumi">
                        {getMonthName(month)} {year}
                    </h1>
                    <Link
                        href={nextHref}
                        className="p-2 hover:bg-sumi/5 rounded-full transition-colors text-sumi-muted hover:text-sumi"
                    >
                        <ChevronRight size={20} />
                    </Link>
                </div>

                <div className="w-10" />
            </div>

            {/* Grid kalender */}
            <div className="bg-washi">

                {/* Nama hari */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {daysOfWeek.map((day, idx) => (
                        <div key={idx} className="text-center text-[10px] md:text-xs font-bold text-sumi-muted uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid tanggal */}
                <div className="grid grid-cols-7 gap-2 md:gap-3">

                    {/* Kotak kosong sebelum hari pertama */}
                    {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                        <div key={`blank-${idx}`} className="aspect-square" />
                    ))}

                    {/* Tanggal */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const date = i + 1;
                        const dayPosts = postsByDay.get(date) ?? [];
                        const hasPosts = dayPosts.length > 0;
                        const firstPost = dayPosts[0];
                        const coverImage = firstPost?.coverImage ||
                            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop";

                        const cardClasses = `group relative aspect-square rounded-xl overflow-hidden flex flex-col justify-between p-2 md:p-3 transition-all duration-300 ${hasPosts
                            ? "cursor-pointer shadow-sm hover:shadow-lg hover:scale-[1.05] z-10 border border-sumi-10"
                            : "bg-washi border border-sumi-10/50"
                            }`;

                        const CardContent = (
                            <>
                                {hasPosts && (
                                    <>
                                        <img
                                            src={coverImage}
                                            alt={firstPost.title}
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                                        />
                                        <div className="absolute inset-0 bg-sumi/60 group-hover:bg-sumi/50 transition-colors" />
                                    </>
                                )}

                                <span className={`relative z-10 text-base md:text-xl font-bold leading-none ${hasPosts ? "text-washi" : "text-sumi-muted/60"}`}>
                                    {date}
                                </span>

                                {hasPosts && (
                                    <div className="relative z-10 flex items-center gap-1 text-washi">
                                        <FileText size={10} className="opacity-80" />
                                        <span className="text-[9px] md:text-xs font-bold tracking-wide">
                                            {dayPosts.length}
                                            <span className="hidden md:inline"> POST</span>
                                        </span>
                                    </div>
                                )}
                            </>
                        );

                        if (hasPosts && firstPost) {
                            return (
                                <Link href={`/post/${firstPost.slug}`} key={date} className={cardClasses}>
                                    {CardContent}
                                </Link>
                            );
                        }

                        return (
                            <div key={date} className={cardClasses}>
                                {CardContent}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary */}
            {posts.length > 0 && (
                <p className="mt-6 text-center text-xs text-sumi-muted">
                    {posts.length} artikel dipublikasikan di {getMonthName(month)} {year}
                </p>
            )}
        </div>
    );
}