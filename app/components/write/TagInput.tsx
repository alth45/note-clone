"use client";

// components/write/TagInput.tsx
// Tag pills input — Enter atau koma untuk tambah, × untuk hapus, Backspace untuk hapus terakhir.

interface TagInputProps {
    tags: string[];
    input: string;
    onChange: (input: string) => void;
    onAdd: (tag: string) => void;
    onRemove: (tag: string) => void;
    maxTags?: number;
}

export default function TagInput({
    tags,
    input,
    onChange,
    onAdd,
    onRemove,
    maxTags = 10,
}: TagInputProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "," || e.key === "Enter") {
            e.preventDefault();
            const newTag = input.trim().toLowerCase().replace(/^#/, "");
            if (newTag && !tags.includes(newTag) && tags.length < maxTags) {
                onAdd(newTag);
            }
            onChange("");
        }
        if (e.key === "Backspace" && input === "" && tags.length > 0) {
            onRemove(tags[tags.length - 1]);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-sumi-10 pb-3 mb-8">
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sumi/5 border border-sumi-10 text-sumi-muted"
                >
                    <span className="text-sumi-muted/50 text-[10px]">#</span>
                    {tag}
                    <button
                        type="button"
                        onClick={() => onRemove(tag)}
                        className="ml-0.5 text-sumi-muted/40 hover:text-red-400 transition-colors leading-none"
                        aria-label={`Hapus tag ${tag}`}
                    >
                        ×
                    </button>
                </span>
            ))}

            {tags.length < maxTags && (
                <input
                    type="text"
                    value={input}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? "Tambah tag (Enter atau koma)..." : ""}
                    className="flex-1 min-w-[160px] text-sm text-sumi-muted bg-transparent outline-none placeholder:text-sumi-muted/40"
                />
            )}
        </div>
    );
}