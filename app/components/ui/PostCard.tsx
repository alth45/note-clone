import Link from "next/link";
import { Clock } from "lucide-react";

interface PostProps {
    slug: string;
    title: string;
    excerpt: string;
    author: string;
    date: string;
    readTime: string;
    image?: string;
}

export default function PostCard({ slug, title, excerpt, author, date, readTime, image }: PostProps) {
    return (
        <article className="group flex flex-col bg-washi rounded-2xl border border-sumi-10 overflow-hidden hover:shadow-[0_8px_30px_rgb(28,28,30,0.06)] hover:border-sumi/20 transition-all duration-300">
            <Link href={`/post/${slug}`} className="block w-full h-48 overflow-hidden bg-washi-dark relative">
                {image ? (
                    <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-sumi-muted bg-sumi/5">
                        <span className="text-xs">No Image</span>
                    </div>
                )}
            </Link>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-sumi-muted mb-3">
                    <span className="font-semibold text-sumi-light">{author}</span>
                    <span>•</span>
                    <span>{date}</span>
                </div>

                <Link href={`/post/${slug}`} className="block flex-1">
                    <h3 className="text-lg font-bold text-sumi mb-2 leading-snug group-hover:text-sumi-light transition-colors line-clamp-2">
                        {title}
                    </h3>
                    <p className="text-sm text-sumi-light leading-relaxed line-clamp-2 mb-4">
                        {excerpt}
                    </p>
                </Link>

                <div className="flex items-center gap-2 text-xs text-sumi-muted pt-4 border-t border-sumi-10">
                    <Clock size={14} />
                    <span>{readTime} read</span>
                </div>
            </div>
        </article>
    );
}