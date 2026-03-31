"use client";

// components/home/NotesBar.tsx
// Strip notes/stories di beranda — klik buka popup.
// Mirip Instagram Stories tapi versi minimalis teks-only.

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

// ─── Palet warna background ───────────────────────────────────────────────────
const BG_PALETTE = [
    "#1C1C1E", // sumi hitam
    "#2C2C2E", // sumi light
    "#1a3a2a", // forest dark
    "#1a2a3a", // ocean deep
    "#2d1a3a", // purple dark
    "#3a1a1a", // burgundy dark
    "#2a2a1a", // olive dark
    "#1a3a3a", // teal dark
    "#3a2a1a", // bronze dark
    "#1C2B3A", // navy
    "#2B1C3A", // indigo dark
    "#3A1C2B", // rose dark
];

const LIGHT_BG_PALETTE = [
    "#F0EDE8", // warm cream
    "#E8F0ED", // sage mist
    "#E8EDF0", // steel blue mist
    "#F0E8EF", // lavender mist
    "#F0EBE8", // peach mist
    "#E8F0EB", // mint mist
    "#EEE8F0", // violet mist
    "#F0F0E8", // lemon mist
];

const EMOJI_LIST = ["✍️", "💭", "🌙", "⚡", "🎯", "🔥", "💡", "🌊", "🍃", "✨", "🎲", "📌"];

interface NoteAuthor {
    id: string;
    name: string | null;
    handle: string | null;
    image: string | null;
}

interface NoteItem {
    id: string;
    content: string;
    bgColor: string;
    emoji: string | null;
    expiresAt: string | null;
    createdAt: string;
    author: NoteAuthor;
}

// ─── Helper: warna teks kontras ──────────────────────────────────────────────
function isLightColor(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}j`;
    return "kemarin";
}

function timeLeft(expiresAt: string | null): string {
    if (!expiresAt) return "";
    const left = new Date(expiresAt).getTime() - Date.now();
    if (left <= 0) return "kedaluwarsa";
    const hours = Math.floor(left / 3_600_000);
    const mins = Math.floor((left % 3_600_000) / 60_000);
    if (hours > 0) return `${hours}j tersisa`;
    return `${mins}m tersisa`;
}

// ─── Avatar mini ──────────────────────────────────────────────────────────────
function AuthorAvatar({ author, size = 28 }: { author: NoteAuthor; size?: number }) {
    const initials = (author.name ?? "?")[0].toUpperCase();
    return (
        <div
            className="rounded-full overflow-hidden bg-sumi-10 shrink-0 flex items-center justify-center text-[10px] font-bold text-sumi-muted border-2 border-washi"
            style={{ width: size, height: size, minWidth: size }}
        >
            {author.image
                ? <img src={author.image} alt="" className="w-full h-full object-cover" />
                : initials
            }
        </div>
    );
}

// ─── Satu strip bubble (di bar) ───────────────────────────────────────────────
function NoteBubble({
    note,
    onClick,
    isActive,
}: {
    note: NoteItem;
    onClick: () => void;
    isActive: boolean;
}) {
    const isLight = isLightColor(note.bgColor);
    const textColor = isLight ? "rgba(28,28,30,0.85)" : "rgba(249,249,248,0.9)";

    return (
        <button
            onClick={onClick}
            className={`
                relative shrink-0 flex flex-col items-center gap-1.5 group
                transition-all duration-300
                ${isActive ? "scale-110" : "hover:scale-105"}
            `}
        >
            {/* Ring border */}
            <div className={`
                p-[2px] rounded-full transition-all duration-300
                ${isActive
                    ? "bg-gradient-to-br from-sumi to-sumi-light ring-2 ring-sumi/30"
                    : "bg-gradient-to-br from-sumi-10 to-sumi-10/50 group-hover:from-sumi/40 group-hover:to-sumi-10"
                }
            `}>
                {/* Circle preview */}
                <div
                    className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: note.bgColor }}
                >
                    {note.emoji ? (
                        <span className="text-2xl select-none">{note.emoji}</span>
                    ) : (
                        <span
                            className="text-[9px] font-bold leading-tight text-center px-1 line-clamp-3"
                            style={{ color: textColor }}
                        >
                            {note.content.slice(0, 30)}
                        </span>
                    )}
                </div>
            </div>

            {/* Author name */}
            <span className="text-[9px] font-semibold text-sumi-muted truncate w-14 text-center leading-none">
                {note.author.name?.split(" ")[0] ?? "User"}
            </span>
        </button>
    );
}

// ─── Popup viewer (satu note full) ───────────────────────────────────────────
function NoteViewer({
    notes,
    activeIndex,
    onClose,
    onPrev,
    onNext,
    onDelete,
    currentUserId,
}: {
    notes: NoteItem[];
    activeIndex: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    onDelete: (id: string) => void;
    currentUserId: string | null;
}) {
    const note = notes[activeIndex];
    if (!note) return null;

    const isLight = isLightColor(note.bgColor);
    const textColor = isLight ? "#1C1C1E" : "#F9F9F8";
    const mutedColor = isLight ? "rgba(28,28,30,0.5)" : "rgba(249,249,248,0.5)";
    const isOwn = currentUserId === note.author.id;

    // Auto-advance setiap 6 detik
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => {
        timerRef.current = setTimeout(() => {
            if (activeIndex < notes.length - 1) onNext();
            else onClose();
        }, 6000);
        return () => clearTimeout(timerRef.current);
    }, [activeIndex]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" onClick={onClose}>
            {/* Backdrop blur */}
            <div className="absolute inset-0 bg-sumi/50 backdrop-blur-md" />

            {/* Card */}
            <div
                className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                style={{ backgroundColor: note.bgColor, minHeight: 320 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Progress bars */}
                <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
                    {notes.map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 h-0.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: isLight ? "rgba(28,28,30,0.15)" : "rgba(249,249,248,0.2)" }}
                        >
                            <div
                                className={`h-full rounded-full transition-all ${i < activeIndex ? "w-full" : i === activeIndex ? "w-full" : "w-0"}`}
                                style={{
                                    backgroundColor: isLight ? "rgba(28,28,30,0.6)" : "rgba(249,249,248,0.8)",
                                    animation: i === activeIndex ? "progress-fill 6s linear forwards" : undefined,
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-8 left-4 right-4 z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AuthorAvatar author={note.author} size={30} />
                        <div>
                            <p className="text-xs font-bold leading-tight" style={{ color: textColor }}>
                                {note.author.name ?? "Anonim"}
                            </p>
                            <p className="text-[10px]" style={{ color: mutedColor }}>
                                {timeAgo(note.createdAt)} · {timeLeft(note.expiresAt)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {isOwn && (
                            <button
                                onClick={() => onDelete(note.id)}
                                className="p-1.5 rounded-full transition-colors"
                                style={{ color: mutedColor }}
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full transition-colors"
                            style={{ color: mutedColor }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col items-center justify-center min-h-[320px] px-8 py-20 text-center">
                    {note.emoji && (
                        <span className="text-5xl mb-5 select-none">{note.emoji}</span>
                    )}
                    <p
                        className="text-xl font-bold leading-relaxed"
                        style={{ color: textColor }}
                    >
                        {note.content}
                    </p>
                    {note.author.handle && (
                        <Link
                            href={`/u/${note.author.handle}`}
                            onClick={onClose}
                            className="mt-6 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                            style={{
                                color: textColor,
                                backgroundColor: isLight ? "rgba(28,28,30,0.1)" : "rgba(249,249,248,0.12)",
                            }}
                        >
                            @{note.author.handle}
                        </Link>
                    )}
                </div>

                {/* Tap zones (prev/next) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    disabled={activeIndex === 0}
                    className="absolute left-0 top-0 w-1/3 h-full opacity-0"
                />
                <button
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    disabled={activeIndex === notes.length - 1}
                    className="absolute right-0 top-0 w-1/3 h-full opacity-0"
                />

                {/* Arrow hints */}
                {activeIndex > 0 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onPrev(); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full"
                        style={{ backgroundColor: isLight ? "rgba(28,28,30,0.1)" : "rgba(249,249,248,0.12)", color: textColor }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                )}
                {activeIndex < notes.length - 1 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full"
                        style={{ backgroundColor: isLight ? "rgba(28,28,30,0.1)" : "rgba(249,249,248,0.12)", color: textColor }}
                    >
                        <ChevronRight size={18} />
                    </button>
                )}
            </div>

            {/* CSS animation */}
            <style jsx global>{`
                @keyframes progress-fill {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
}

// ─── Composer modal ───────────────────────────────────────────────────────────
function NoteComposer({
    onClose,
    onSubmit,
    isSubmitting,
}: {
    onClose: () => void;
    onSubmit: (content: string, bgColor: string, emoji: string | null) => Promise<void>;
    isSubmitting: boolean;
}) {
    const [content, setContent] = useState("");
    const [selectedBg, setSelectedBg] = useState(BG_PALETTE[0]);
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
    const [isDark, setIsDark] = useState(true);
    const maxChars = 280;

    const allColors = isDark ? BG_PALETTE : LIGHT_BG_PALETTE;
    const isLight = isLightColor(selectedBg);
    const textColor = isLight ? "#1C1C1E" : "#F9F9F8";
    const mutedColor = isLight ? "rgba(28,28,30,0.5)" : "rgba(249,249,248,0.5)";

    const handleSubmit = async () => {
        if (!content.trim()) return;
        await onSubmit(content, selectedBg, selectedEmoji);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-4 pb-4" onClick={onClose}>
            <div className="absolute inset-0 bg-sumi/50 backdrop-blur-md" />

            <div
                className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Preview area */}
                <div
                    className="flex flex-col items-center justify-center px-8 py-10 text-center min-h-[160px] transition-colors duration-300"
                    style={{ backgroundColor: selectedBg }}
                >
                    {selectedEmoji && (
                        <span className="text-4xl mb-3 select-none">{selectedEmoji}</span>
                    )}
                    <p
                        className="text-lg font-bold leading-relaxed transition-colors duration-300"
                        style={{ color: content ? textColor : mutedColor }}
                    >
                        {content || "Apa yang ada di pikiranmu..."}
                    </p>
                </div>

                {/* Controls */}
                <div className="bg-washi p-4 flex flex-col gap-4">

                    {/* Textarea */}
                    <div className="relative">
                        <textarea
                            autoFocus
                            value={content}
                            onChange={(e) => setContent(e.target.value.slice(0, maxChars))}
                            placeholder="Tulis catatan singkat..."
                            rows={3}
                            className="w-full resize-none rounded-2xl border border-sumi-10 bg-washi-dark px-4 py-3 text-sm text-sumi outline-none focus:border-sumi/40 transition-colors placeholder:text-sumi-muted/50"
                        />
                        <span className={`absolute bottom-3 right-3 text-[10px] font-medium ${content.length > maxChars * 0.9 ? "text-amber-500" : "text-sumi-muted/40"}`}>
                            {content.length}/{maxChars}
                        </span>
                    </div>

                    {/* Color picker */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-sumi-muted uppercase tracking-wider">Warna</span>
                            <button
                                onClick={() => {
                                    setIsDark(!isDark);
                                    setSelectedBg(isDark ? LIGHT_BG_PALETTE[0] : BG_PALETTE[0]);
                                }}
                                className="text-[10px] font-medium text-sumi-muted hover:text-sumi transition-colors border border-sumi-10 px-2 py-0.5 rounded-full"
                            >
                                {isDark ? "☀️ Terang" : "🌙 Gelap"}
                            </button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {allColors.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedBg(color)}
                                    className={`w-7 h-7 rounded-full transition-all duration-200 ${selectedBg === color ? "scale-125 ring-2 ring-sumi ring-offset-1" : "hover:scale-110"}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Emoji picker */}
                    <div>
                        <span className="text-xs font-bold text-sumi-muted uppercase tracking-wider mb-2 block">Emoji (opsional)</span>
                        <div className="flex gap-1.5 flex-wrap">
                            <button
                                onClick={() => setSelectedEmoji(null)}
                                className={`px-2.5 py-1 rounded-full text-xs transition-all ${!selectedEmoji ? "bg-sumi text-washi" : "bg-sumi-10 text-sumi-muted hover:bg-sumi/10"}`}
                            >
                                None
                            </button>
                            {EMOJI_LIST.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => setSelectedEmoji(selectedEmoji === emoji ? null : emoji)}
                                    className={`w-8 h-8 rounded-full text-sm transition-all flex items-center justify-center ${selectedEmoji === emoji ? "bg-sumi scale-110 ring-1 ring-sumi ring-offset-1" : "bg-sumi-10 hover:scale-105"}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-2xl border border-sumi-10 text-sm font-medium text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!content.trim() || isSubmitting}
                            className="flex-1 py-2.5 rounded-2xl bg-sumi text-washi text-sm font-bold hover:bg-sumi-light transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <><Loader2 size={14} className="animate-spin" /> Posting...</>
                            ) : (
                                "Bagikan Note"
                            )}
                        </button>
                    </div>

                    <p className="text-[10px] text-sumi-muted/50 text-center">
                        Note akan otomatis hilang dalam 24 jam
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotesBar() {
    const { data: session } = useSession();
    const [notes, setNotes] = useState<NoteItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingIndex, setViewingIndex] = useState<number | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const currentUserId = (session?.user as any)?.id ?? null;

    // Fetch notes
    const fetchNotes = useCallback(async () => {
        try {
            const res = await fetch("/api/notes");
            if (res.ok) {
                const data = await res.json();
                setNotes(Array.isArray(data) ? data : []);
            }
        } catch { /* silent */ }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchNotes(); }, [fetchNotes]);

    const handleSubmit = async (content: string, bgColor: string, emoji: string | null) => {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, bgColor, emoji }),
            });
            if (res.ok) {
                const newNote = await res.json();
                setNotes((prev) => [newNote, ...prev]);
                setIsComposing(false);
            }
        } catch { /* silent */ }
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setViewingIndex(null);
        await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    };

    if (isLoading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="shrink-0 flex flex-col items-center gap-1.5">
                        <div className="w-14 h-14 rounded-full bg-sumi-10/50 animate-pulse" />
                        <div className="w-10 h-2 rounded bg-sumi-10/40 animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            <div
                ref={scrollRef}
                className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2"
            >
                {/* Tombol buat note baru */}
                {session && (
                    <button
                        onClick={() => setIsComposing(true)}
                        className="shrink-0 flex flex-col items-center gap-1.5 group"
                    >
                        <div className="w-14 h-14 rounded-full border-2 border-dashed border-sumi-10 group-hover:border-sumi/40 flex items-center justify-center transition-all duration-300 group-hover:scale-105 bg-washi-dark/50">
                            <Plus size={20} className="text-sumi-muted group-hover:text-sumi transition-colors" />
                        </div>
                        <span className="text-[9px] font-semibold text-sumi-muted truncate w-14 text-center leading-none">
                            Tambah
                        </span>
                    </button>
                )}

                {/* Empty state */}
                {notes.length === 0 && !session && (
                    <div className="flex items-center gap-3 py-2 text-sm text-sumi-muted/60">
                        <span>Belum ada notes hari ini.</span>
                        <Link href="/login" className="text-sumi font-medium hover:underline underline-offset-2">
                            Login untuk berbagi →
                        </Link>
                    </div>
                )}

                {notes.length === 0 && session && (
                    <p className="text-sm text-sumi-muted/60 py-2">
                        Jadilah yang pertama berbagi note hari ini!
                    </p>
                )}

                {/* Notes list */}
                {notes.map((note, i) => (
                    <NoteBubble
                        key={note.id}
                        note={note}
                        onClick={() => setViewingIndex(i)}
                        isActive={viewingIndex === i}
                    />
                ))}
            </div>

            {/* Viewer popup */}
            {viewingIndex !== null && (
                <NoteViewer
                    notes={notes}
                    activeIndex={viewingIndex}
                    onClose={() => setViewingIndex(null)}
                    onPrev={() => setViewingIndex((i) => Math.max(0, (i ?? 0) - 1))}
                    onNext={() => {
                        if (viewingIndex < notes.length - 1) {
                            setViewingIndex((i) => (i ?? 0) + 1);
                        } else {
                            setViewingIndex(null);
                        }
                    }}
                    onDelete={handleDelete}
                    currentUserId={currentUserId}
                />
            )}

            {/* Composer popup */}
            {isComposing && (
                <NoteComposer
                    onClose={() => setIsComposing(false)}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                />
            )}
        </>
    );
}