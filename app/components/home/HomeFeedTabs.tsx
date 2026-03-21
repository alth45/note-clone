"use client";

// components/home/HomeFeedTabs.tsx
// Tab switcher di beranda: "Terbaru" vs "Following".
// Client karena perlu useState untuk active tab.
// Konten masing-masing tab diterima sebagai ReactNode dari Server Component parent.

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Rss, Globe } from "lucide-react";
import FollowingFeed from "@/components/home/FollowingFeed";

interface HomeFeedTabsProps {
    allFeedNode: React.ReactNode;   // grid artikel semua
    allTagsNode: React.ReactNode;   // CategoryFilter
    activeTag: string | null;
}

export default function HomeFeedTabs({
    allFeedNode,
    allTagsNode,
    activeTag,
}: HomeFeedTabsProps) {
    const { data: session } = useSession();
    const [tab, setTab] = useState<"all" | "following">("all");

    // Tab "Following" hanya muncul kalau user login
    const showFollowingTab = !!session;

    return (
        <div>
            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-6 border-b border-sumi-10">
                <button
                    onClick={() => setTab("all")}
                    className={`flex items-center gap-2 pb-3 px-1 mr-3 text-sm font-bold transition-colors relative ${tab === "all"
                            ? "text-sumi"
                            : "text-sumi-muted hover:text-sumi-light"
                        }`}
                >
                    <Globe size={14} />
                    {activeTag ? `#${activeTag}` : "Terbaru"}
                    {tab === "all" && (
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-sumi rounded-t-full" />
                    )}
                </button>

                {showFollowingTab && (
                    <button
                        onClick={() => setTab("following")}
                        className={`flex items-center gap-2 pb-3 px-1 text-sm font-bold transition-colors relative ${tab === "following"
                                ? "text-sumi"
                                : "text-sumi-muted hover:text-sumi-light"
                            }`}
                    >
                        <Rss size={14} />
                        Following
                        {tab === "following" && (
                            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-sumi rounded-t-full" />
                        )}
                    </button>
                )}
            </div>

            {/* Tab: Terbaru */}
            {tab === "all" && (
                <div className="flex flex-col gap-4">
                    {/* CategoryFilter dari server */}
                    <div>{allTagsNode}</div>
                    {/* Grid artikel dari server */}
                    <div>{allFeedNode}</div>
                </div>
            )}

            {/* Tab: Following */}
            {tab === "following" && showFollowingTab && (
                <FollowingFeed />
            )}
        </div>
    );
}