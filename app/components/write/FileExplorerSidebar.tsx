"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ChevronRight, ChevronDown, Folder, FileText, Plus,
    MoreHorizontal, Search, Edit2, Trash2, FilePlus, FolderPlus
} from "lucide-react";

type FileItem = {
    id: string;
    type: "file" | "folder";
    name: string;
    parentId: string | null;
    isOpen?: boolean;
    isEditing?: boolean;
};

export default function FileExplorerSidebar() {
    const router = useRouter();
    const params = useParams();
    const currentPostId = params.postId as string;

    // 1. KOSONGIN DEFAULT VALUE, TAMBAH STATE LOADING
    const [items, setItems] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<"file" | "folder" | null>(null);
    const [newItemName, setNewItemName] = useState("");
    const [creatingParentId, setCreatingParentId] = useState<string | null>(null);

    const createInputRef = useRef<HTMLInputElement>(null);

    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean; x: number; y: number; targetId: string | null;
    }>({ isOpen: false, x: 0, y: 0, targetId: null });

    // =========================================================
    // 2. FETCH DATA DARI POSTGRESQL SAAT HALAMAN DIBUKA
    // =========================================================
    useEffect(() => {
        const fetchExplorerData = async () => {
            try {
                const res = await fetch("/api/explorer");
                if (res.ok) {
                    const data = await res.json();
                    setItems(data);
                }
            } catch (error) {
                console.error("Gagal menarik data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchExplorerData();
    }, []);

    // Efek buat nandain file yang lagi dibuka di Editor sebagai 'Active' di Sidebar
    useEffect(() => {
        if (currentPostId) {
            setActiveId(currentPostId);
        } else {
            setActiveId(null);
        }
    }, [currentPostId]);

    useEffect(() => {
        if (isCreating && createInputRef.current) createInputRef.current.focus();
    }, [isCreating]);

    useEffect(() => {
        const handleClickOutside = () => setContextMenu((prev) => ({ ...prev, isOpen: false }));
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    // =========================================================
    // 3. FUNGSI CREATE (TEMBAK API POSTS / EXPLORER)
    // =========================================================
    const handleCreateSubmit = async () => {
        if (newItemName.trim() === "") {
            setIsCreating(null);
            setNewItemName("");
            setCreatingParentId(null);
            return;
        }

        const name = newItemName.trim();
        const type = isCreating!;
        const parentId = creatingParentId;

        try {
            if (type === "folder") {
                const res = await fetch("/api/explorer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, parentId })
                });
                const newFolder = await res.json();
                setItems((prev) => [newFolder, ...prev]);

            } else {
                // Kalo bikin file, tembak API post yang udah kita modif biar nerima folderId
                const res = await fetch("/api/posts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ folderId: parentId, title: name })
                });
                const newFile = await res.json();

                const newItem: FileItem = {
                    id: newFile.id,
                    type: "file",
                    name: newFile.title,
                    parentId: newFile.folderId,
                };

                setItems((prev) => [newItem, ...prev]);
                router.push(`/write/${newItem.id}`); // Langsung loncat ke file itu
            }
        } catch (error) {
            console.error("Gagal membuat item:", error);
        }

        setIsCreating(null);
        setNewItemName("");
        setCreatingParentId(null);
    };

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveId(id);
        setContextMenu({ isOpen: true, x: e.pageX, y: e.pageY, targetId: id });
    };

    // =========================================================
    // 4. FUNGSI RENAME (TEMBAK API PATCH)
    // =========================================================
    const startRename = (id: string) => setItems(items.map(item => item.id === id ? { ...item, isEditing: true } : item));

    const finishRename = async (id: string, newName: string) => {
        const itemTarget = items.find(i => i.id === id);
        if (!itemTarget) return;

        const finalName = newName.trim() || itemTarget.name;

        // Update UI cepet-cepet biar user nggak ngerasa lag
        setItems(items.map(item => item.id === id ? { ...item, name: finalName, isEditing: false } : item));

        if (finalName !== itemTarget.name) {
            try {
                await fetch(`/api/explorer/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: itemTarget.type, name: finalName })
                });
            } catch (error) {
                console.error("Gagal ganti nama");
            }
        }
    };

    // =========================================================
    // 5. FUNGSI DELETE (TEMBAK API DELETE)
    // =========================================================
    const deleteItem = async (id: string) => {
        const itemTarget = items.find(i => i.id === id);
        if (!itemTarget) return;

        setItems(items.filter(item => item.id !== id && item.parentId !== id));

        if (currentPostId === id) {
            router.push('/write');
        } else if (activeId === id) {
            setActiveId(null);
        }

        try {
            await fetch(`/api/explorer/${id}?type=${itemTarget.type}`, {
                method: "DELETE"
            });
        } catch (error) {
            console.error("Gagal hapus item");
        }
    };

    const createInsideFolder = (type: "file" | "folder") => {
        setIsCreating(type);
        setCreatingParentId(contextMenu.targetId);
        setItems(items.map(i => i.id === contextMenu.targetId ? { ...i, isOpen: true } : i));
    };

    const renderFileTree = (parentId: string | null = null, depth: number = 0) => {
        const children = items.filter(item => item.parentId === parentId);

        return (
            <div className="flex flex-col gap-0.5 w-full">
                {isCreating && creatingParentId === parentId && (
                    <div
                        className="flex items-center gap-2 p-1.5 rounded-md text-sm text-sumi bg-sumi/5 border border-sumi/20 mb-1"
                        style={{ paddingLeft: `${(depth * 1) + 0.375}rem` }}
                    >
                        {isCreating === "folder" ? <Folder size={14} className="text-sumi fill-sumi/20 shrink-0" /> : <FileText size={14} className="text-sumi shrink-0" />}
                        <input
                            ref={createInputRef}
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCreateSubmit(); else if (e.key === "Escape") { setIsCreating(null); setCreatingParentId(null); } }}
                            onBlur={handleCreateSubmit}
                            className="flex-1 bg-transparent outline-none text-xs font-medium text-sumi w-full"
                            placeholder={isCreating === "folder" ? "Nama folder..." : "Nama file..."}
                        />
                    </div>
                )}

                {children.map((item) => (
                    <div key={item.id}>
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveId(item.id);
                                if (item.type === "folder") {
                                    setItems(items.map(i => i.id === item.id ? { ...i, isOpen: !i.isOpen } : i));
                                } else {
                                    router.push(`/write/${item.id}`);
                                }
                            }}
                            onContextMenu={(e) => handleContextMenu(e, item.id)}
                            className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer group transition-colors text-sm ${activeId === item.id || currentPostId === item.id ? "bg-sumi/10 text-sumi font-medium" : "hover:bg-sumi/5 text-sumi-muted hover:text-sumi"
                                }`}
                            style={{ paddingLeft: `${(depth * 1) + 0.375}rem` }}
                        >
                            <div className="flex items-center gap-2 w-full">
                                {item.type === "folder" && (
                                    <span className={`transition-transform duration-200 ${item.isOpen ? "rotate-90" : ""}`}>
                                        <ChevronRight size={14} className="text-sumi-muted/70" />
                                    </span>
                                )}
                                {item.type === "folder" ? (
                                    <Folder size={14} className={`shrink-0 ${activeId === item.id ? "text-sumi fill-sumi/20" : ""}`} />
                                ) : (
                                    <FileText size={14} className={`shrink-0 ${activeId === item.id || currentPostId === item.id ? "text-sumi" : ""}`} />
                                )}

                                {item.isEditing ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        defaultValue={item.name}
                                        className="flex-1 bg-washi border border-sumi-10 rounded px-1 py-0.5 outline-none text-xs font-medium text-sumi w-full"
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") finishRename(item.id, e.currentTarget.value);
                                            if (e.key === "Escape") finishRename(item.id, item.name);
                                        }}
                                        onBlur={(e) => finishRename(item.id, e.target.value)}
                                    />
                                ) : (
                                    <span className="truncate flex-1">{item.name}</span>
                                )}
                            </div>
                        </div>

                        {item.type === "folder" && item.isOpen && (
                            <div>
                                {renderFileTree(item.id, depth + 1)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <aside className="w-64 border-r border-sumi-10 bg-washi-dark/30 flex flex-col h-[calc(100vh-64px)] sticky top-16 shrink-0 relative">

            {contextMenu.isOpen && (
                <div
                    className="fixed z-[200] w-48 bg-washi/90 backdrop-blur-md border border-sumi-10 rounded-xl shadow-[0_8px_30px_rgb(28,28,30,0.12)] p-1 py-1.5 flex flex-col animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    {items.find(i => i.id === contextMenu.targetId)?.type === "folder" && (
                        <>
                            <button onClick={() => createInsideFolder("file")} className="flex items-center gap-2 px-3 py-1.5 text-xs text-sumi font-medium hover:bg-sumi/5 rounded-md w-full text-left transition-colors">
                                <FilePlus size={14} className="text-sumi-muted" /> File Baru di sini
                            </button>
                            <button onClick={() => createInsideFolder("folder")} className="flex items-center gap-2 px-3 py-1.5 text-xs text-sumi font-medium hover:bg-sumi/5 rounded-md w-full text-left transition-colors">
                                <FolderPlus size={14} className="text-sumi-muted" /> Folder Baru di sini
                            </button>
                            <div className="h-[1px] w-full bg-sumi-10 my-1"></div>
                        </>
                    )}

                    <button onClick={() => startRename(contextMenu.targetId!)} className="flex items-center gap-2 px-3 py-1.5 text-xs text-sumi font-medium hover:bg-sumi/5 rounded-md w-full text-left transition-colors">
                        <Edit2 size={14} className="text-sumi-muted" /> Ganti Nama
                    </button>
                    <button onClick={() => deleteItem(contextMenu.targetId!)} className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 font-medium hover:bg-red-50 rounded-md w-full text-left transition-colors">
                        <Trash2 size={14} className="text-red-400" /> Hapus
                    </button>
                </div>
            )}

            <div className="p-4 border-b border-sumi-10 flex items-center justify-between">
                <span className="text-xs font-bold text-sumi-muted uppercase tracking-widest">Eksplorer</span>
                <div className="flex gap-1">
                    <button onClick={() => { setIsCreating("file"); setCreatingParentId(null); }} className="p-1 text-sumi-muted hover:text-sumi hover:bg-sumi/10 rounded transition-colors" title="File Baru (Root)">
                        <Plus size={16} />
                    </button>
                    <button onClick={() => { setIsCreating("folder"); setCreatingParentId(null); }} className="p-1 text-sumi-muted hover:text-sumi hover:bg-sumi/10 rounded transition-colors" title="Folder Baru (Root)">
                        <Folder size={16} />
                    </button>
                </div>
            </div>

            <div className="px-4 py-3 border-b border-sumi-10">
                <div className="flex items-center gap-2 bg-washi border border-sumi-10 rounded-md px-2 py-1.5 focus-within:border-sumi transition-colors">
                    <Search size={14} className="text-sumi-muted" />
                    <input type="text" placeholder="Cari file..." className="bg-transparent border-none outline-none text-xs w-full text-sumi placeholder:text-sumi-muted" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide select-none overflow-x-hidden">
                {isLoading ? (
                    <div className="text-center py-10 text-xs text-sumi-muted animate-pulse">Memuat struktur...</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-10 text-xs text-sumi-muted/70">Belum ada file. Buat sekarang!</div>
                ) : (
                    renderFileTree(null, 0)
                )}
            </div>

        </aside>
    );
}