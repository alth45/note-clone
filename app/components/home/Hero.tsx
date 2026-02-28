import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
    return (
        <section className="relative rounded-3xl bg-washi-dark p-8 md:p-12 border border-sumi-10 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-washi-dark via-washi to-matcha/20 opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative z-10 max-w-2xl">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-sumi">
                    Ruang untuk <span className="text-sumi-muted font-normal">Ide & Cerita.</span>
                </h1>
                <p className="text-base text-sumi-light mb-6 leading-relaxed max-w-lg">
                    Platform minimalis untuk membagikan pemikiran dan catatan teknis.
                </p>
                <Link
                    href="/write"
                    className="inline-flex items-center gap-2 bg-sumi text-washi px-5 py-2.5 rounded-full text-sm font-medium hover:bg-sumi-light transition-all shadow-sm"
                >
                    Mulai Menulis <ArrowRight size={16} />
                </Link>
            </div>
        </section>
    );
}