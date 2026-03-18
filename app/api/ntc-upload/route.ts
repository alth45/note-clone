import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// --- THE FAST PARSER ENGINE V4 (Anti-Potong Kodingan Python) ---
function parseNtcToHtml(rawText: string) {
    let html = rawText.replace(/\r\n/g, '\n');

    // --- BRANKAS SEMENTARA (Buat ngumpetin tag besar biar gak dibelah enter) ---
    const protectedBlocks: string[] = [];

    // 1. AMANKAN BLOK KODE (Masukin ke brankas)
    html = html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const className = lang ? `language-${lang.trim()}` : 'language-text';
        const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const blockHtml = `\n<pre><code class="${className}">${escapedCode}</code></pre>\n`;

        protectedBlocks.push(blockHtml);
        return `\n__PROTECTED_BLOCK_${protectedBlocks.length - 1}__\n`;
    });

    // 2. AMANKAN BLOK SLIDE
    html = html.replace(/:::SLIDE\s*\n([\s\S]*?)\n:::/g, (_, content) => {
        let url = content.trim();
        if (url.includes("docs.google.com/presentation/d/")) {
            url = url.replace(/\/edit.*|\/view.*/, '/embed?start=false&loop=false&delayms=3000');
        }
        const blockHtml = `\n<div class="slide-wrapper relative w-full aspect-video rounded-xl overflow-hidden border border-sumi-10 shadow-sm my-8 bg-washi-dark"><iframe src="${url}" data-slide-embed="true" width="100%" height="100%" frameborder="0" allowfullscreen="true" class="absolute inset-0 w-full h-full"></iframe></div>\n`;

        protectedBlocks.push(blockHtml);
        return `\n__PROTECTED_BLOCK_${protectedBlocks.length - 1}__\n`;
    });

    // 3. AMANKAN BLOK IMAGE
    html = html.replace(/:::IMAGE\s*\n([\s\S]*?)\n:::/g, (_, content) => {
        const lines = content.trim().split('\n');
        const url = lines[0].trim();
        const caption = lines.slice(1).join(' ').replace(/^CAPTION:\s*/i, '').trim();
        const figcaption = caption ? `<figcaption class="text-center text-xs text-sumi-muted p-3 border-t border-sumi-10 bg-washi">${caption}</figcaption>` : '';
        const blockHtml = `\n<figure class="my-8 rounded-2xl overflow-hidden border border-sumi-10 bg-washi-dark"><img src="${url}" alt="${caption || 'Gambar Artikel'}" class="w-full h-auto object-cover" />${figcaption}</figure>\n`;

        protectedBlocks.push(blockHtml);
        return `\n__PROTECTED_BLOCK_${protectedBlocks.length - 1}__\n`;
    });

    // 4. AMANKAN TABEL
    html = html.replace(/(?:^\|.*\|\n?)+/gm, (match) => {
        const lines = match.trim().split('\n');
        if (lines.length < 2) return match;

        let tableHtml = '<table>\n';
        lines.forEach((line, index) => {
            const cells = line.split('|').map(c => c.trim()).slice(1, -1);
            if (cells.length === 0) return;
            if (index === 1 && cells.every(c => /^[-:]+$/.test(c))) return;

            if (index === 0) {
                tableHtml += '  <thead>\n    <tr>\n';
                cells.forEach(c => tableHtml += `      <th>${c}</th>\n`);
                tableHtml += '    </tr>\n  </thead>\n  <tbody>\n';
            } else {
                tableHtml += '    <tr>\n';
                cells.forEach(c => tableHtml += `      <td>${c}</td>\n`);
                tableHtml += '    </tr>\n';
            }
        });
        tableHtml += '  </tbody>\n</table>\n';

        protectedBlocks.push(tableHtml);
        return `\n__PROTECTED_BLOCK_${protectedBlocks.length - 1}__\n`;
    });

    // 1. Parsing LINKED IMAGE / BADGE (Contoh: [![Python](img-url)](link-url) )
    // Kita kasih class inline-block & h-6 biar badge-nya rapi sejajar sama teks
    html = html.replace(/\[\!\[([^\]]*)\]\((.*?)\)\]\((.*?)\)/g, '<a href="$3" target="_blank" rel="noopener noreferrer" class="inline-block mx-1 hover:opacity-80 transition-opacity"><img src="$2" alt="$1" class="inline-block m-0 h-6 align-middle" /></a>');

    // 2. Parsing GAMBAR STANDAR INLINE (Contoh: ![Alt](img-url) )
    html = html.replace(/\!\[([^\]]*)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="inline-block m-0 align-middle" />');

    // 3. Parsing LINK STANDAR (Contoh: [Google](https://google.com) )
    html = html.replace(/\[([^\]]+)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline">$1</a>');
    // --- SEKARANG PARSING TEXT INLINE SEPERTI BIASA ---
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 5. SMART PARAGRAPH WRAPPER (Sekarang aman, karena kodingan udah diumpetin)
    const blocks = html.split(/\n{2,}/);
    const parsedBlocks = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';

        // Kalau ketahuan ini adalah brankas atau heading, biarin aja
        if (trimmed.startsWith('__PROTECTED_BLOCK_') || trimmed.startsWith('<h')) {
            return trimmed;
        }

        const textWithBreaks = trimmed.replace(/\n/g, '<br/>');
        return `<p>${textWithBreaks}</p>`;
    });

    html = parsedBlocks.join('\n');

    // 6. BUKA BRANKAS: Balikin semua Kodingan, Tabel, dan Gambar ke posisi aslinya!
    protectedBlocks.forEach((blockHtml, index) => {
        html = html.replace(`__PROTECTED_BLOCK_${index}__`, blockHtml);
    });

    return html;
}

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return NextResponse.json({ message: "Akses ditolak. Token tidak ditemukan." }, { status: 401 });
        }

        // --- PERUBAHAN UTAMA: CARI USER BERDASARKAN TOKEN ---
        const user = await prisma.user.findUnique({
            where: { cliToken: token }
        });

        // Kalau tokennya nggak valid / nggak ada di DB
        if (!user) {
            return NextResponse.json({ message: "Sesi tidak valid! Silakan login ulang di terminal (ntc login)." }, { status: 401 });
        }

        const { title, rawContent } = await req.json();
        const htmlContent = parseNtcToHtml(rawContent);
        const deterministicSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        // CEK DATABASE: Apakah user ini udah pernah push file ini?
        // Ingat, kita cek berdasarkan authorId: user.id (Jadi file user A nggak bakal nimpa file user B)
        const existingPost = await prisma.post.findFirst({
            where: {
                slug: deterministicSlug,
                authorId: user.id
            }
        });

        if (existingPost) {
            const existingContentStr = typeof existingPost.content === 'string'
                ? existingPost.content
                : (existingPost.content as any)?.html || JSON.stringify(existingPost.content);

            if (existingContentStr === htmlContent) {
                return NextResponse.json({
                    message: "Konten identik.", action: "unchanged", postId: existingPost.id, slug: existingPost.slug
                }, { status: 200 });
            }

            const updatedPost = await prisma.post.update({
                where: { id: existingPost.id },
                data: { content: htmlContent }
            });

            return NextResponse.json({ message: "Update", action: "updated", postId: updatedPost.id }, { status: 200 });

        } else {
            // JIKA BELUM ADA -> BIKIN BARU ATAS NAMA USER TERSEBUT
            const newPost = await prisma.post.create({
                data: {
                    title: title.replace(/-/g, ' '),
                    slug: deterministicSlug,
                    content: htmlContent,
                    published: false,
                    authorId: user.id // <-- KUNCI UTAMANYA DI SINI
                }
            });

            return NextResponse.json({ message: "Push Baru", action: "created", postId: newPost.id }, { status: 201 });
        }

    } catch (error) {
        console.error("NTC Upload Error:", error);
        return NextResponse.json({ message: "Gagal memproses file .ntc di server." }, { status: 500 });
    }
}