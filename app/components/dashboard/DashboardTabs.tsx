"use client";

// components/dashboard/DashboardTabs.tsx

import type { Tab } from "@/hooks/useDashboard";

interface DashboardTabsProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    publishedCount: number;
    draftCount: number;
    savedCount: number;
}

const TAB_CONFIG: { id: Tab; label: string }[] = [
    { id: "published", label: "Telah Terbit" },
    { id: "draft", label: "Draf" },
    { id: "saved", label: "Tersimpan" },
];

export default function DashboardTabs({
    activeTab,
    onTabChange,
    publishedCount,
    draftCount,
    savedCount,
}: DashboardTabsProps) {
    const counts: Record<Tab, number> = {
        published: publishedCount,
        draft: draftCount,
        saved: savedCount,
    };

    return (
        <div className="flex items-center gap-6 border-b border-sumi-10 mb-8 overflow-x-auto scrollbar-hide">
            {TAB_CONFIG.map(({ id, label }) => {
                const count = counts[id];
                const isActive = activeTab === id;

                return (
                    <button
                        key={id}
                        onClick={() => onTabChange(id)}
                        className={`pb-3 text-sm font-bold transition-colors relative whitespace-nowrap ${isActive ? "text-sumi" : "text-sumi-muted hover:text-sumi-light"
                            }`}
                    >
                        {label}
                        {count > 0 && (
                            <span className={`ml-1 text-[10px] ${id === "draft"
                                    ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 px-1.5 py-0.5 rounded-full"
                                    : "opacity-50"
                                }`}>
                                ({count})
                            </span>
                        )}
                        {isActive && (
                            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-sumi rounded-t-full" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}