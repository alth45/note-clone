import { Hash } from "lucide-react";

interface Category {
    name: string;
    active: boolean;
}

interface CategoryFilterProps {
    categories: Category[];
}

export default function CategoryFilter({ categories }: CategoryFilterProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
            {categories.map((cat, index) => (
                <button
                    key={index}
                    className={`
            flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border
            ${cat.active
                            ? 'bg-sumi text-washi border-sumi shadow-sm'
                            : 'bg-washi border-sumi-10 text-sumi-muted hover:text-sumi hover:border-sumi/30'
                        }
          `}
                >
                    {cat.name !== "Semua" && (
                        <Hash
                            size={12}
                            className={cat.active ? "text-washi/70" : "text-sumi-muted/70"}
                        />
                    )}
                    {cat.name}
                </button>
            ))}
        </div>
    );
}