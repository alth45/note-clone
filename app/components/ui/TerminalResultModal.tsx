"use client";

import { X, LayoutList, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TerminalResultModalProps {
    isOpen: boolean;
    title: string;
    result: any;
    onClose: () => void;
}

export default function TerminalResultModal({ isOpen, title, result, onClose }: TerminalResultModalProps) {
    const router = useRouter();
    const [renderData, setRenderData] = useState<any[]>([]);
    const [message, setMessage] = useState<string>("");

    // --- STATE KONFIGURASI TOMBOL AKSI ---
    const [config, setConfig] = useState({ canEdit: false, canTrash: false });

    // --- STATE PAGINATION ---
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && result) {
            if (Array.isArray(result)) setRenderData(result);
            else if (result.data && Array.isArray(result.data)) setRenderData(result.data);

            if (result.message) setMessage(result.message);
            else setMessage("");

            // Tangkap config aksi dari API
            if (result.config) setConfig(result.config);
            else setConfig({ canEdit: false, canTrash: false });

            // Reset ke halaman 1 tiap kali modal baru dibuka
            setCurrentPage(1);
        }
    }, [isOpen, result]);

    if (!isOpen) return null;

    // --- LOGIKA PAGINATION ---
    const totalPages = Math.ceil(renderData.length / ITEMS_PER_PAGE);
    const paginatedData = renderData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // --- FUNGSI KLIK EDIT ---
    const handleEdit = (id: string) => {
        onClose(); // Tutup modal
        router.push(`/write/${id}`); // Lempar ke halaman editor
    };

    // --- FUNGSI KLIK TRASH ---
    const handleDelete = async (id: string) => {
        if (!confirm("Yakin ingin menghapus baris data ini dari database?")) return;

        setIsDeletingId(id);
        try {
            const res = await fetch(`/api/explorer/${id}?type=file`, {
                method: "DELETE"
            });
            if (res.ok) {
                // Hapus data dari layar secara instan (Optimistic Update)
                setRenderData(prev => prev.filter(item => item.id !== id));
            }
        } catch (error) {
            console.error("Gagal menghapus:", error);
        } finally {
            setIsDeletingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-sumi/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-washi border border-sumi-10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-sumi-10 bg-washi-dark/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sumi/5 rounded-lg">
                            <LayoutList size={18} className="text-sumi" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-sumi">Hasil Query Data</h3>
                            <p className="text-xs text-sumi-muted">{title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-sumi-muted hover:text-sumi hover:bg-sumi/10 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body Table */}
                <div className="p-6 overflow-y-auto scrollbar-hide flex-1">
                    {message && (
                        <div className="mb-6 px-4 py-3 bg-sumi/5 border border-sumi-10 rounded-xl text-sm text-sumi font-medium">
                            {message}
                        </div>
                    )}
                    {/* --- TAMBAHAN BARU: RENDER MODE NEOFETCH --- */}
                    {result?.type === "code" ? (
                        <div className="p-6 bg-[#0a0a0c] rounded-xl border border-sumi-10 shadow-inner overflow-x-auto">
                            <div className="flex items-center gap-2 mb-4 border-b border-sumi-10/30 pb-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                                <span className="ml-2 text-[10px] text-sumi-muted font-mono tracking-widest">session.json</span>
                            </div>
                            <pre className="font-mono text-sm text-emerald-400 whitespace-pre">
                                <span className="text-blue-400">root@noteos</span>:<span className="text-sumi-muted">~#</span> whoami{"\n"}
                                {result.data}
                            </pre>
                        </div>
                    ) : result?.type === "neofetch" ? (
                        <div className="flex flex-col md:flex-row gap-8 items-start p-4 font-mono text-sm bg-washi-dark/50 rounded-xl border border-sumi-10">
                            {/* ASCII Art Keren */}
                            <div className="text-emerald-500 whitespace-pre leading-[1.15] font-bold select-none">
                                {`       .-------.
      /   >_  / \\
     /       /   \\
    .-------.     \\
    |       |-----|
    | Note  |     |
    |  OS   |     |
    '-------'-----'`}
                            </div>

                            {/* Data Statistik */}
                            <div className="flex flex-col gap-1 text-sumi w-full">
                                <div className="text-emerald-600 font-bold text-base mb-1">
                                    {result.data.user}<span className="text-sumi-muted">@</span>note-engine
                                </div>
                                <div className="text-sumi-muted mb-2">-------------------</div>
                                <div><span className="text-emerald-600 font-bold w-24 inline-block">OS:</span> {result.data.os}</div>
                                <div><span className="text-emerald-600 font-bold w-24 inline-block">Database:</span> {result.data.db}</div>
                                <div><span className="text-emerald-600 font-bold w-24 inline-block">Uptime:</span> 99.9% (Vercel Edge)</div>

                                <div className="text-sumi-muted mt-2 mb-2">-------------------</div>

                                <div><span className="text-blue-500 font-bold w-24 inline-block">Total Post:</span> {result.data.totalPosts} file</div>
                                <div><span className="text-emerald-500 font-bold w-24 inline-block">  ├ Publik:</span> {result.data.published} post</div>
                                <div><span className="text-yellow-500 font-bold w-24 inline-block">  └ Draf:</span> {result.data.drafts} post</div>

                                <div className="mt-2"><span className="text-purple-500 font-bold w-24 inline-block">Total Kata:</span> ~{result.data.totalWords.toLocaleString('id-ID')} kata</div>
                                <div><span className="text-rose-500 font-bold w-24 inline-block">Top Hari:</span> {result.data.activeDay}</div>

                                {/* Color Palette khas neofetch */}
                                <div className="flex gap-2 mt-5">
                                    <div className="w-5 h-5 bg-sumi rounded-sm shadow-sm"></div>
                                    <div className="w-5 h-5 bg-rose-500 rounded-sm shadow-sm"></div>
                                    <div className="w-5 h-5 bg-emerald-500 rounded-sm shadow-sm"></div>
                                    <div className="w-5 h-5 bg-yellow-500 rounded-sm shadow-sm"></div>
                                    <div className="w-5 h-5 bg-blue-500 rounded-sm shadow-sm"></div>
                                    <div className="w-5 h-5 bg-purple-500 rounded-sm shadow-sm"></div>
                                </div>
                            </div>
                        </div>

                    ) : renderData.length === 0 ? (
                        <div className="text-center py-10 text-sm text-sumi-muted">
                            Tidak ada data yang cocok dengan kriteria pencarian.
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto rounded-xl border border-sumi-10 bg-washi-dark/30">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-sumi/5 border-b border-sumi-10 text-sumi-muted text-[11px] uppercase tracking-widest">
                                        <th className="px-4 py-3 font-semibold">ID</th>
                                        <th className="px-4 py-3 font-semibold">Judul Artikel</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold">Tanggal</th>

                                        {/* TAMPILKAN HEADER AKSI KALAU SALAH SATU FLAG AKTIF */}
                                        {(config.canEdit || config.canTrash) && (
                                            <th className="px-4 py-3 font-semibold text-right">Aksi Sistem</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((row, idx) => (
                                        <tr key={row.id} className="border-b border-sumi-10 last:border-0 hover:bg-sumi/5 transition-colors group">
                                            <td className="px-4 py-3 font-mono text-xs text-sumi-muted group-hover:text-sumi transition-colors">
                                                {row.id?.slice(-6)}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-sumi max-w-[250px] truncate">
                                                {row.title}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.published ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                                                        PUBLIK
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-600 text-[10px] font-bold border border-yellow-500/20">
                                                        DRAFT
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sumi-muted text-xs">
                                                {new Date(row.createdAt || row.updatedAt).toLocaleDateString('id-ID', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </td>

                                            {/* KOLOM TOMBOL AKSI */}
                                            {(config.canEdit || config.canTrash) && (
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {config.canEdit && (
                                                            <button
                                                                onClick={() => handleEdit(row.id)}
                                                                className="p-1.5 text-sumi-muted hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                        )}
                                                        {config.canTrash && (
                                                            <button
                                                                onClick={() => handleDelete(row.id)}
                                                                disabled={isDeletingId === row.id}
                                                                className="p-1.5 text-sumi-muted hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                                                title="Hapus"
                                                            >
                                                                {isDeletingId === row.id ? (
                                                                    <Loader2 size={14} className="animate-spin text-red-500" />
                                                                ) : (
                                                                    <Trash2 size={14} />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Pagination (Cuma Muncul Kalau Datanya Lebihi 1 Halaman) */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-sumi-10 bg-washi-dark/50 flex items-center justify-between shrink-0">
                        <span className="text-xs font-medium text-sumi-muted">
                            Halaman {currentPage} dari {totalPages} <span className="opacity-50">({renderData.length} total)</span>
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-sumi-10 text-sumi-muted hover:text-sumi hover:bg-sumi/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-sumi-10 text-sumi-muted hover:text-sumi hover:bg-sumi/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}