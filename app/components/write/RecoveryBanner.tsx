"use client";

// components/write/RecoveryBanner.tsx
// Banner amber di atas editor saat ada draft localStorage yang lebih baru.

import { RotateCcw, X } from "lucide-react";
import type { DraftBackup } from "@/components/write/utils/draftStorage";
import { formatRelativeTime } from "@/components/write/utils/draftStorage";

interface RecoveryBannerProps {
    backup: DraftBackup;
    onRestore: () => void;
    onDismiss: () => void;
}

export default function RecoveryBanner({
    backup,
    onRestore,
    onDismiss,
}: RecoveryBannerProps) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-200 text-sm">
            <RotateCcw size={15} className="text-amber-600 shrink-0" />
            <span className="flex-1 text-amber-800">
                Draft lokal ditemukan dari{" "}
                <strong>{formatRelativeTime(backup.savedAt)}</strong>
                {" "}— mungkin lebih baru dari versi server.
            </span>
            <button
                onClick={onRestore}
                className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shrink-0"
            >
                Pulihkan
            </button>
            <button
                onClick={onDismiss}
                className="p-1 text-amber-500 hover:text-amber-700 transition-colors shrink-0"
                aria-label="Abaikan draft lokal"
            >
                <X size={14} />
            </button>
        </div>
    );
}