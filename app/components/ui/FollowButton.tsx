"use client";

// components/ui/FollowButton.tsx
// Tombol follow/unfollow dengan optimistic update.
// Fetch status awal dari /api/follow/[handle].

import { useState, useEffect } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
    handle: string;     // handle target yang mau di-follow
    targetId: string;     // id target
    initialFollowing?: boolean;    // opsional — kalau sudah diketahui dari server
    initialCount?: number;
    onCountChange?: (count: number) => void;
    size?: "sm" | "md";
}

export default function FollowButton({
    handle,
    targetId,
    initialFollowing,
    initialCount,
    onCountChange,
    size = "md",
}: FollowButtonProps) {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [isFollowing, setIsFollowing] = useState(initialFollowing ?? false);
    const [count, setCount] = useState(initialCount ?? 0);
    const [isLoading, setIsLoading] = useState(initialFollowing === undefined);
    const [isHovering, setIsHovering] = useState(false);

    // Fetch status awal kalau tidak diberikan dari parent
    useEffect(() => {
        if (initialFollowing !== undefined) {
            setIsLoading(false);
            return;
        }
        if (status === "loading") return;

        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/follow/${handle}`);
                const data = await res.json();
                setIsFollowing(data.isFollowing ?? false);
                setCount(data.followerCount ?? 0);
            } catch {
                // silent
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();
    }, [handle, status, initialFollowing]);

    const handleClick = async () => {
        if (!session) {
            router.push("/login");
            return;
        }

        // Optimistic update
        const wasFollowing = isFollowing;
        const prevCount = count;
        const nextFollowing = !wasFollowing;
        const nextCount = wasFollowing ? count - 1 : count + 1;

        setIsFollowing(nextFollowing);
        setCount(nextCount);
        onCountChange?.(nextCount);
        setIsLoading(true);

        try {
            const res = await fetch("/api/follow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ followingId: targetId }),
            });

            if (!res.ok) throw new Error("server error");

            const data = await res.json();
            // Sync dengan angka dari server
            setIsFollowing(data.following);
            setCount(data.followerCount);
            onCountChange?.(data.followerCount);

        } catch {
            // Rollback
            setIsFollowing(wasFollowing);
            setCount(prevCount);
            onCountChange?.(prevCount);
        } finally {
            setIsLoading(false);
        }
    };

    // Jangan tampilkan kalau user lihat profil sendiri
    const myHandle = (session?.user as any)?.handle;
    if (myHandle && myHandle === handle) return null;

    const sizeClass = size === "sm"
        ? "px-3 py-1.5 text-xs rounded-lg"
        : "px-5 py-2.5 text-sm rounded-full";

    if (isLoading && initialFollowing === undefined) {
        return (
            <div className={`${sizeClass} border border-sumi-10 flex items-center gap-2 text-sumi-muted bg-washi`}>
                <Loader2 size={13} className="animate-spin" />
                <span className="font-medium">Memuat...</span>
            </div>
        );
    }

    if (isFollowing) {
        return (
            <button
                onClick={handleClick}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                disabled={isLoading}
                className={`${sizeClass} flex items-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 ${isHovering
                        ? "bg-red-50 border border-red-200 text-red-500"
                        : "bg-sumi/5 border border-sumi-10 text-sumi"
                    }`}
            >
                {isLoading
                    ? <Loader2 size={14} className="animate-spin" />
                    : isHovering
                        ? <UserPlus size={14} />
                        : <UserCheck size={14} />
                }
                {isHovering ? "Batal Follow" : "Mengikuti"}
            </button>
        );
    }

    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            className={`${sizeClass} flex items-center gap-2 font-medium bg-sumi text-washi hover:bg-sumi-light transition-all duration-200 disabled:opacity-50`}
        >
            {isLoading
                ? <Loader2 size={14} className="animate-spin text-washi" />
                : <UserPlus size={14} />
            }
            Ikuti
        </button>
    );
}