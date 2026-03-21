"use client";

// components/dashboard/DashboardHeader.tsx

import Link from "next/link";
import {
    PenSquare, Settings, Camera, Save, X, BarChart2,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface DashboardHeaderProps {
    user: any;
    isEditing: boolean;
    editName: string;
    editHandle: string;
    editBio: string;
    onEditName: (v: string) => void;
    onEditHandle: (v: string) => void;
    onEditBio: (v: string) => void;
    onStartEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onCreatePost: () => void;
}

export default function DashboardHeader({
    user, isEditing,
    editName, editHandle, editBio,
    onEditName, onEditHandle, onEditBio,
    onStartEdit, onSave, onCancel, onCreatePost,
}: DashboardHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12 pb-12 border-b border-sumi-10 mt-8">

            {/* ── Avatar + fields ── */}
            <div className="flex flex-col md:flex-row items-start gap-6 w-full md:w-auto">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border border-sumi-10 bg-washi-dark shrink-0 group">
                    <img
                        src={
                            user.image ||
                            `https://ui-avatars.com/api/?name=${user.name}&background=1c1c1e&color=f4f4f5`
                        }
                        alt={user.name || "User"}
                        className={`w-full h-full object-cover transition-all ${isEditing ? "opacity-50 blur-[2px]" : ""}`}
                    />
                    {isEditing && (
                        <button className="absolute inset-0 flex flex-col items-center justify-center text-washi bg-sumi/40 hover:bg-sumi/60 transition-colors z-10 cursor-pointer">
                            <Camera size={24} />
                        </button>
                    )}
                </div>

                <div className="w-full md:w-[400px]">
                    {isEditing ? (
                        <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => onEditName(e.target.value)}
                                placeholder="Nama Lengkap"
                                className="text-2xl md:text-3xl font-bold text-sumi bg-transparent border-b border-sumi-10 focus:border-sumi outline-none pb-1 w-full"
                            />
                            <input
                                type="text"
                                value={editHandle}
                                onChange={(e) => onEditHandle(e.target.value)}
                                placeholder="Username / Handle"
                                className="text-sm font-medium text-sumi-muted bg-transparent border-b border-sumi-10 focus:border-sumi outline-none pb-1 w-full"
                            />
                            <textarea
                                value={editBio}
                                onChange={(e) => onEditBio(e.target.value)}
                                placeholder="Tulis bio singkat..."
                                className="text-sm text-sumi-light leading-relaxed bg-transparent border border-sumi-10 rounded-xl p-3 outline-none focus:border-sumi resize-none h-24 w-full mt-2"
                            />
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-200">
                            <h1 className="text-3xl font-bold text-sumi tracking-tight mb-1">
                                {editName}
                            </h1>
                            <p className="text-sm font-medium text-sumi-muted mb-3">
                                {editHandle}
                            </p>
                            <p className="text-sm text-sumi-light max-w-md leading-relaxed">
                                {editBio}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Action buttons ── */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                {isEditing ? (
                    <>
                        <button
                            onClick={onCancel}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-sumi-10 text-sm font-medium text-sumi hover:bg-sumi/5 transition-colors"
                        >
                            <X size={16} /> Batal
                        </button>
                        <button
                            onClick={onSave}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-sumi text-washi text-sm font-bold hover:bg-sumi-light transition-all"
                        >
                            <Save size={16} /> Simpan
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={onStartEdit}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-sumi-10 text-sm font-medium text-sumi hover:bg-sumi/5 transition-colors"
                        >
                            <Settings size={16} /> Edit Profil
                        </button>
                        <Link
                            href="/dashboard/analytics"
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-sumi-10 text-sm font-medium text-sumi hover:bg-sumi/5 transition-colors"
                        >
                            <BarChart2 size={16} /> Analitik
                        </Link>
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                        >
                            Keluar
                        </button>
                        <button
                            onClick={onCreatePost}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-sumi text-washi text-sm font-bold hover:bg-sumi-light hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <PenSquare size={16} /> Tulis Baru
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}