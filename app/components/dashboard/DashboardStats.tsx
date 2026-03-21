"use client";

// components/dashboard/DashboardStats.tsx

import Link from "next/link";
import { FileText, Eye, Bookmark, Loader2 } from "lucide-react";

interface DashboardStatsProps {
    totalPosts: number;
    totalViews: number;
    savedCount: number;
    isLoadingPosts: boolean;
    isLoadingSaved: boolean;
    activeTab: string;
}

export default function DashboardStats({
    totalPosts,
    totalViews,
    savedCount,
    isLoadingPosts,
    isLoadingSaved,
    activeTab,
}: DashboardStatsProps) {
    const formatted = (n: number) =>
        n >= 1000 ? (n / 1000).toFixed(1) + "k" : n;

    const cards = [
        {
            icon: <FileText size={20} />,
            value: totalPosts,
            label: "Postingan",
            href: undefined,
            loading: isLoadingPosts,
        },
        {
            icon: <Eye size={20} />,
            value: formatted(totalViews),
            label: "Total Views",
            href: "/dashboard/analytics",
            loading: isLoadingPosts,
        },
        {
            icon: <Bookmark size={20} />,
            value: isLoadingSaved && activeTab !== "saved" ? "—" : savedCount,
            label: "Tersimpan",
            href: undefined,
            loading: false,
        },
    ];

    return (
        <div className="grid grid-cols-3 gap-4 mb-12">
            {cards.map(({ icon, value, label, href, loading }) => {
                const inner = (
                    <div className="bg-washi-dark/50 border border-sumi-10 rounded-2xl p-5 flex flex-col items-center justify-center text-center group hover:border-sumi/20 hover:shadow-[0_4px_20px_rgb(28,28,30,0.05)] transition-all duration-300">
                        <span className="text-sumi-muted mb-2 group-hover:text-sumi transition-colors">
                            {icon}
                        </span>
                        {loading
                            ? <Loader2 className="animate-spin text-sumi mb-1" size={24} />
                            : <span className="text-2xl font-black text-sumi mb-1">{value}</span>
                        }
                        <span className="text-[10px] font-bold text-sumi-muted uppercase tracking-widest">
                            {label}
                        </span>
                    </div>
                );

                return href
                    ? <Link key={label} href={href}>{inner}</Link>
                    : <div key={label}>{inner}</div>;
            })}
        </div>
    );
}