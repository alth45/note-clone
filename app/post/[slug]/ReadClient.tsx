"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Hash, BookOpen, FileText, Columns, Monitor, List, ChevronRight, ChevronLeft } from "lucide-react";
import ReadingProgress from "@/components/ui/ReadingProgress";
import FloatingActionBar from "@/components/ui/FloatingActionBar";

import parse, { domToReact, HTMLReactParserOptions } from 'html-react-parser';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import RelatedArticles from "./RelatedArticles";
import CommentThread from "@/components/ui/CommentThread";
import { useSearchParams } from "next/navigation";
import SeriesNav from "@/components/ui/SeriesNav";

type ReadMode = 'default' | 'journal' | 'pdf' | 'zen';

interface TocItem {
    id: string;
    text: string;
    level: number;
    // FIX 1: hapus field 'series' yang tidak dipakai
}

export default function ReadClient({ post, relatedPosts = [], relatedReason = 'recent' }: {
    // FIX 2: hapus prop 'series' yang tidak dipakai
    post: any;
    relatedPosts?: any;
    relatedReason?: any;
}) {
    const [mode, setMode] = useState<ReadMode>('default');
    const [toc, setToc] = useState<TocItem[]>([]);
    const [activeId, setActiveId] = useState<string>("");
    const [isTocOpen, setIsTocOpen] = useState(true);
    // FIX 3: hapus 'mounted' state yang di-set tapi tidak pernah dipakai

    const searchParams = useSearchParams();
    const seriesSlug = searchParams.get("series");

    const htmlContent = typeof post.content === 'string'
        ? post.content
        : (post.content?.html || "");

    const formattedDate = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date(post.updatedAt));

    const wordCount = htmlContent.replace(/<[^>]*>?/gm, '').split(/\s+/).length;
    const readTime = `${Math.ceil(wordCount / 200)} min read`;

    // FIX 4: tags dari post.tags bukan hardcoded
    const tags = post.tags ?? [];

    useEffect(() => {
        const article = document.getElementById("article-content");
        if (!article) return;

        const headings = Array.from(article.querySelectorAll("h2, h3"));

        const tocData = headings.map((heading, index) => {
            const text = heading.textContent || "";
            const slug = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            if (!heading.id) heading.id = slug;
            return {
                id: heading.id,
                text,
                level: heading.tagName === "H2" ? 2 : 3
            };
        });

        setToc(tocData);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveId(entry.target.id);
                });
            },
            { rootMargin: "0px 0px -80% 0px" }
        );

        headings.forEach((h) => observer.observe(h));
        return () => observer.disconnect();
    }, [htmlContent]);

    const scrollToHeading = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const y = element.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    let containerStyle = "mx-auto pb-20 px-6 transition-all duration-700 ease-in-out w-full ";
    let proseStyle = "prose max-w-none transition-all duration-700 ease-in-out " +
        "[&_.slide-wrapper]:w-full [&_.slide-wrapper]:aspect-video [&_.slide-wrapper]:my-10 [&_.slide-wrapper]:rounded-2xl [&_.slide-wrapper]:overflow-hidden [&_.slide-wrapper]:shadow-lg [&_.slide-wrapper]:border [&_.slide-wrapper]:border-sumi-10 " +
        "[&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0 [&_iframe]:absolute [&_iframe]:inset-0 ";

    switch (mode) {
        case 'default':
            containerStyle += "max-w-5xl";
            proseStyle += "prose-lg prose-sumi prose-p:text-sumi-light prose-p:leading-relaxed font-sans";
            break;
        case 'journal':
            containerStyle += "max-w-6xl bg-[#F8F5F0] p-10 md:p-16 shadow-[0_0_40px_rgba(0,0,0,0.05)] border-t-[12px] border-sumi rounded-b-xl";
            proseStyle += "prose-xl prose-sumi font-serif prose-p:text-sumi prose-p:leading-loose prose-p:text-justify prose-blockquote:border-sumi/20";
            break;
        case 'pdf':
            containerStyle += "max-w-[90rem]";
            proseStyle += "prose-base prose-sumi md:columns-2 md:gap-16 prose-p:break-inside-avoid-column prose-h3:break-after-avoid-column prose-img:break-inside-avoid-column font-sans prose-p:text-justify";
            break;
        case 'zen':
            containerStyle += "max-w-4xl bg-sumi p-10 md:p-16 rounded-3xl !text-washi";
            proseStyle += "prose-lg prose-invert prose-p:text-washi/80 prose-h3:text-washi font-sans";
            proseStyle += " [&_.slide-wrapper]:border-washi/10 [&_.slide-wrapper]:shadow-2xl";
            break;
    }

    const renderOptions: HTMLReactParserOptions = {
        replace: (domNode: any) => {
            if (domNode.name === 'pre' && domNode.children[0]?.name === 'code') {
                const codeNode = domNode.children[0];
                const codeString = codeNode.children[0]?.data || '';
                const className = codeNode.attribs?.class || '';
                const match = /language-(\w+)/.exec(className);
                const lang = match ? match[1] : 'javascript';

                return (
                    <div className="my-8 rounded-xl overflow-hidden shadow-2xl border border-gray-700/50 break-inside-avoid-column">
                        <div className="bg-[#1e1e1e] border-b border-gray-800 px-4 py-2 flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="ml-2 text-xs text-gray-400 font-mono tracking-wider">{lang.toUpperCase()}</span>
                        </div>
                        <SyntaxHighlighter
                            language={lang}
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: '1.5rem', background: '#1e1e1e', fontSize: '0.9rem' }}
                        >
                            {codeString.trim()}
                        </SyntaxHighlighter>
                    </div>
                );
            }

            if (domNode.name === 'code') {
                return (
                    <code className="bg-orange-500/10 text-orange-600 border border-orange-500/20 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono mx-1 shadow-sm break-words">
                        {domToReact(domNode.children, renderOptions)}
                    </code>
                );
            }

            if (domNode.name === 'table') {
                return (
                    <div className="overflow-x-auto my-8 rounded-xl shadow-sm break-inside-avoid-column">
                        <table className="min-w-full divide-y divide-gray-300 text-sm border-collapse border border-gray-300">
                            {domToReact(domNode.children, renderOptions)}
                        </table>
                    </div>
                );
            }
            if (domNode.name === 'thead') {
                return <thead className="bg-gray-100">{domToReact(domNode.children, renderOptions)}</thead>;
            }
            if (domNode.name === 'th') {
                return <th className="px-6 py-4 text-left font-bold text-gray-800 uppercase tracking-wider border border-gray-300">{domToReact(domNode.children, renderOptions)}</th>;
            }
            if (domNode.name === 'td') {
                return <td className="px-6 py-4 whitespace-nowrap text-gray-700 border border-gray-300">{domToReact(domNode.children, renderOptions)}</td>;
            }
        }
    };

    return (
        <div className="relative">
            <ReadingProgress />

            {toc.length > 0 && mode !== 'zen' && mode !== 'pdf' && (
                <div className={`hidden xl:flex flex-col fixed top-32 right-8 transition-all duration-500 z-30 ${isTocOpen ? 'w-64' : 'w-12 items-end'}`}>
                    <div className="flex items-center justify-between w-full mb-4">
                        {isTocOpen && (
                            <h4 className="text-xs font-bold uppercase tracking-widest text-sumi-muted flex items-center gap-2 whitespace-nowrap">
                                <List size={14} /> Di Halaman Ini
                            </h4>
                        )}
                        <button
                            onClick={() => setIsTocOpen(!isTocOpen)}
                            className="p-1.5 rounded-md hover:bg-sumi-10 text-sumi-muted hover:text-sumi transition-all border border-transparent hover:border-sumi-10 shadow-sm bg-washi-dark/50"
                            title={isTocOpen ? "Sembunyikan Daftar Isi" : "Tampilkan Daftar Isi"}
                        >
                            {isTocOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    </div>

                    {isTocOpen && (
                        <div className="relative border-l border-sumi-10 pl-4 space-y-3 max-h-[70vh] overflow-y-auto scrollbar-hide animate-in fade-in duration-300 w-full">
                            {toc.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToHeading(item.id)}
                                    className={`block w-full text-left text-sm transition-all duration-300 relative ${activeId === item.id
                                        ? "text-sumi font-bold scale-105 origin-left"
                                        : "text-sumi-muted hover:text-sumi"
                                        } ${item.level === 3 ? "pl-3 text-[13px]" : ""}`}
                                >
                                    {activeId === item.id && (
                                        <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sumi shadow-[0_0_8px_rgba(28,28,30,0.5)] transition-all duration-300" />
                                    )}
                                    <span className="line-clamp-2">{item.text}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {mode !== 'zen' && (
                <FloatingActionBar
                    postId={post.id}
                    initialLikes={post.likesCount}
                    hasLiked={false}
                />
            )}

            <article className={containerStyle}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pt-4">
                    <Link href="/" className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${mode === 'zen' ? 'text-washi/50 hover:text-washi' : 'text-sumi-muted hover:text-sumi'}`}>
                        <ArrowLeft size={16} /> Kembali
                    </Link>

                    <div className={`flex items-center gap-1 p-1 rounded-full border backdrop-blur-md ${mode === 'zen' ? 'border-washi/10 bg-sumi-light/50' : 'border-sumi-10 bg-washi/80'}`}>
                        <button onClick={() => setMode('default')} title="Mode Standar" className={`p-2 rounded-full transition-all ${mode === 'default' ? 'bg-sumi text-washi shadow-md' : (mode === 'zen' ? 'text-washi/50 hover:text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5')}`}><Monitor size={16} /></button>
                        <button onClick={() => setMode('journal')} title="Mode Jurnal Klasik" className={`p-2 rounded-full transition-all ${mode === 'journal' ? 'bg-sumi text-washi shadow-md' : (mode === 'zen' ? 'text-washi/50 hover:text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5')}`}><FileText size={16} /></button>
                        <button onClick={() => setMode('pdf')} title="Mode PDF (2 Kolom)" className={`p-2 rounded-full transition-all ${mode === 'pdf' ? 'bg-sumi text-washi shadow-md' : (mode === 'zen' ? 'text-washi/50 hover:text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5')}`}><Columns size={16} /></button>
                        <button onClick={() => setMode('zen')} title="Zen Mode (Fokus Malam)" className={`p-2 rounded-full transition-all ${mode === 'zen' ? 'bg-washi text-sumi shadow-md' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5'}`}><BookOpen size={16} /></button>
                    </div>
                </div>

                <header className="mb-12">
                    <div className={`flex items-center gap-2 text-sm mb-6 ${mode === 'zen' ? 'text-washi/60' : 'text-sumi-muted'}`}>
                        <span className={`font-semibold ${mode === 'zen' ? 'text-washi' : 'text-sumi'}`}>{post.author?.name || "Penulis Misterius"}</span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {readTime}</span>
                    </div>

                    <div className={`w-full flex flex-col items-center justify-center p-10 md:p-20 text-center relative overflow-hidden aspect-[21/9]
                        ${mode === 'journal' ? 'rounded-none border border-sumi/20' : 'rounded-3xl shadow-xl'}
                        ${mode === 'zen' ? 'bg-sumi-light border border-washi/10' : 'bg-gradient-to-br from-sumi to-sumi-light'}
                    `}>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight drop-shadow-md z-10 max-w-4xl text-washi">
                            {post.title}
                        </h1>
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-washi to-transparent mix-blend-overlay" />
                    </div>

                    {/* FIX 4: tags dari post.tags, pakai Link agar bisa diklik */}
                    {tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap mt-8">
                            {tags.map((tag: string) => (
                                <Link
                                    key={tag}
                                    href={`/?tag=${encodeURIComponent(tag)}`}
                                    className={`flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border transition-colors
                                        ${mode === 'zen' ? 'bg-sumi-light text-washi/80 border-washi/10' : 'bg-washi-dark text-sumi-muted border-sumi-10 hover:border-sumi/30 hover:text-sumi'}`}
                                >
                                    <Hash size={12} /> {tag}
                                </Link>
                            ))}
                        </div>
                    )}
                </header>

                <div id="article-content" className={proseStyle}>
                    {parse(htmlContent, renderOptions)}
                </div>
            </article>

            {/* FIX 5: SeriesNav di luar <article> dengan prop currentSlug yang benar */}
            {seriesSlug && (
                <SeriesNav
                    currentSlug={post.slug}
                    seriesSlug={seriesSlug}
                />
            )}

            <RelatedArticles posts={relatedPosts} reason={relatedReason} />
            <CommentThread postId={post.id} />
        </div>
    );
}