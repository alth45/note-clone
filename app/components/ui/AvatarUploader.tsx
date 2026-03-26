/**
 * app/components/ui/AvatarUploader.tsx
 *
 * Komponen upload avatar user.
 * Dipasang di DashboardHeader sebagai pengganti tombol kamera yang sekarang
 * hanya styling tapi tidak berfungsi.
 *
 * Cara pasang di DashboardHeader.tsx:
 *   Ganti bagian <div className="relative w-24 h-24 rounded-full...">
 *   dengan <AvatarUploader user={user} onUpdate={(url) => ...} />
 */

"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";
import { useSession } from "next-auth/react";

interface AvatarUploaderProps {
    currentImage: string | null;
    userName: string | null;
    isEditing: boolean;
    onUpdate?: (newUrl: string) => void;
}

export default function AvatarUploader({
    currentImage,
    userName,
    isEditing,
    onUpdate,
}: AvatarUploaderProps) {
    const { update: updateSession } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { upload, isUploading, progress, error } = useUpload("avatar");
    const [localPreview, setLocalPreview] = useState<string | null>(null);

    const displayImage =
        localPreview ??
        currentImage ??
        `https://ui-avatars.com/api/?name=${encodeURIComponent(userName ?? "U")}&background=1c1c1e&color=f4f4f5`;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview lokal dulu biar responsif
        const preview = URL.createObjectURL(file);
        setLocalPreview(preview);

        // Upload ke Supabase (API route akan update DB juga)
        const uploadedUrl = await upload(file, currentImage ?? undefined);

        URL.revokeObjectURL(preview);

        if (uploadedUrl) {
            setLocalPreview(uploadedUrl);
            onUpdate?.(uploadedUrl);
            // Update session supaya navbar langsung ganti foto
            await updateSession({ image: uploadedUrl });
        } else {
            setLocalPreview(null); // rollback preview kalau gagal
        }
    };

    return (
        <div className="relative w-24 h-24 rounded-full overflow-hidden border border-sumi-10 bg-washi-dark shrink-0 group">
            <img
                src={displayImage}
                alt={userName ?? "User"}
                className={`w-full h-full object-cover transition-all ${isEditing || isUploading ? "opacity-50 blur-[2px]" : ""
                    }`}
            />

            {/* Progress ring saat uploading */}
            {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-sumi/40 z-10">
                    <div className="flex flex-col items-center gap-1">
                        <Loader2 size={20} className="animate-spin text-washi" />
                        <span className="text-[10px] text-washi font-bold">{progress}%</span>
                    </div>
                </div>
            )}

            {/* Tombol upload — hanya muncul saat isEditing */}
            {isEditing && !isUploading && (
                <>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 flex flex-col items-center justify-center text-washi bg-sumi/40 hover:bg-sumi/60 transition-colors z-10 cursor-pointer"
                        title="Ganti foto profil"
                    >
                        <Camera size={24} />
                        <span className="text-[9px] font-bold mt-1">Ganti</span>
                    </button>
                </>
            )}

            {/* Error toast kecil */}
            {error && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-[9px] font-bold text-center py-1 z-20">
                    {error.includes("besar") ? "File terlalu besar" : "Gagal upload"}
                </div>
            )}
        </div>
    );
}