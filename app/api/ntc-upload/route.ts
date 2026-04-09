import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

// ─── URL whitelist: hanya izinkan skema yang aman ─────────────────────────────
function isSafeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
        return false;
    }
}

// ─── Sanitasi teks biasa dari karakter HTML berbahaya ─────────────────────────
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ─── Validasi & sanitasi title dari CLI ──────────────────────────────────────
function sanitizeTitle(raw: string): string | null {
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.length > 200) return null;
    // Strip karakter HTML — title tidak boleh mengandung tag apapun
    const stripped = trimmed.replace(/[<>"'`&]/g, "");
    if (!stripped) return null;
    return stripped;
}

// --- THE FAST PARSER ENGINE V4 (Anti-Potong Kodingan Python) ---
function parseNtcToHtml(rawText: string): string {
    let html = rawText.replace(/\r\n/g, "\n");

    // --- BRANKAS SEMENTARA ---
    const protectedBlocks: string[] = [];

    // 1. AMANKAN BLOK KODE
    html = html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const className = lang ? `language-${lang.trim()}` : "language-text";
        // Escape HTML di dalam code block — kode tidak boleh dieksekusi
        const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const blockHtml = `\n<pre><code class="${className}">${escapedCode}</code></pre>\n`;
        protectedBlocks.push(blockHtml);
        return `\n__PROTECTED_BLOCK_${protectedBlocks.length - 1}__\n`;
    });

    // 2. AMANKAN BLOK SLIDE — validasi URL sebelum masuk iframe src
    html = html.replace(/:::SLIDE\s*\n([\s\S]*?)\n:::/g, (_, content) => {
        let url = content.trim();

        // Tolak URL yang tidak aman — tidak masuk iframe sama sekali
        if (!isSafeUrl(url)) {
            const blockHtml = `\n<p><em>Slide tidak dapat dimuat: URL tidak valid.</em></p>\n`;
            protectedBlocks.push(blockHtml);
            return `\n__PROTECTED_BLOCK_${protectedBlocks.length - 1}__\n`;
        }

        if (url.includes("docs.google.com/presentation/d/")) {
            url = url.replace(/\/edit.*|\/view.*/, "/embed?start=false&loop=false&delayms=3000");
        }

        const blockHtml = `\n<div class="slide-wrapper relative w-full aspect-video rounded-xl overflow-hidden border border-sumi-10 shadow-sm my-8 bg-washi-dark"><iframe src="${escapeHtml(url)}" data-slide-embed="true" width="100%" height="100%" frameborder="0" allowfullscreen="true" class="absolute inset-0 w-full h-full"></iframe></div>\n`;
        protectedBlocks.push(blockHtml);
        return `\n__PROTECTED_BLOCK_${protectedBlocks.length - 1}__\n`;
    });

    // 3. AMANKAN BLOK IMAGE — validasi URL dan escape caption
    html = html.replace(/:::IMAGE\s*\n([\s\S]*?)\n:::/g, (_, content) => {
        const lines = content.trim().split("\n");
        const url = lines[0].trim();
        const caption = lines.slice(1).join(" ").replace(/^CAPTION:\s*/i, "").trim();

        // Tolak URL gambar yang tidak aman
        if (!isSafeUrl(url)) {
            const blockHtml = `\n<p><em>Gambar tidak dapat dimuat: URL tidak valid.</em></p>\n`;
            protectedBlocks.push(blockHtml);
            return `\n__PROTECTED_BLOCK_${protectedBlocks.length - 1}__\n`;
        }

        // Escape caption sebelum masuk HTML — caption bisa berisi input user
        const safeCaption = escapeHtml(caption);
        const safeUrl = escapeHtml(url);
        const figcaption = safeCaption
            ? `<figcaption class="text-center text-xs text-sumi-muted p-3 border-t border-sumi-10 bg-washi">${safeCaption}</figcaption>`
            : "";

        const blockHtml = `\n<figure class="my-8 rounded-2xl overflow-hidden border border-sumi-10 bg-washi-dark"><img src="${safeUrl}" alt="${safeCaption || "Gambar Artikel"}" class="w-full h-auto object-cover" />${figcaption}</figure>\n`;
        protectedBlocks.push(blockHtml);
        return `\n__PROTECTED_BLOCK_${protectedBlocks.length - 1}__\n`;
    });

    // 4. AMANKAN TABEL — escape konten cell
    html = html.replace(/(?:^\|.*\|\n?)+/gm, (match) => {
        const lines = match.trim().split("\n");
        if (lines.length < 2) return match;

        let tableHtml = "<table>\n";
        lines.forEach((line, index) => {
            const cells = line.split("|").map((c) => escapeHtml(c.trim())).slice(1, -1);
            if (cells.length === 0) return;
            if (index === 1 && cells.every((c) => /^[-:]+$/.test(c))) return;

            if (index === 0) {
                tableHtml += "  <thead>\n    <tr>\n";
                cells.forEach((c) => (tableHtml += `      <th>${c}</th>\n`));
                tableHtml += "    </tr>\n  </thead>\n  <tbody>\n";
            } else {
                tableHtml += "    <tr>\n";
                cells.forEach((c) => (tableHtml += `      <td>${c}</td>\n`));
                tableHtml += "    </tr>\n";
            }
        });
        tableHtml += "  </tbody>\n</table>\n";

        protectedBlocks.push(tableHtml);
        return `\n__PROTECTED_BLOCK_${protectedBlocks.length - 1}__\n`;
    });

    // 5. LINKED IMAGE / BADGE — validasi kedua URL (img dan link)
    html = html.replace(
        /\[\!\[([^\]]*)\]\((.*?)\)\]\((.*?)\)/g,
        (_, alt, imgUrl, linkUrl) => {
            const safeAlt = escapeHtml(alt);
            const safeImg = isSafeUrl(imgUrl) ? escapeHtml(imgUrl) : "";
            const safeLink = isSafeUrl(linkUrl) ? escapeHtml(linkUrl) : "#";
            if (!safeImg) return safeAlt; // fallback ke teks alt saja
            return `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="inline-block mx-1 hover:opacity-80 transition-opacity"><img src="${safeImg}" alt="${safeAlt}" class="inline-block m-0 h-6 align-middle" /></a>`;
        }
    );

    // 6. GAMBAR STANDAR INLINE — validasi URL
    html = html.replace(/\!\[([^\]]*)\]\((.*?)\)/g, (_, alt, imgUrl) => {
        const safeAlt = escapeHtml(alt);
        if (!isSafeUrl(imgUrl)) return safeAlt; // fallback ke teks alt
        return `<img src="${escapeHtml(imgUrl)}" alt="${safeAlt}" class="inline-block m-0 align-middle" />`;
    });

    // 7. LINK STANDAR — validasi URL, tolak javascript: dan data:
    html = html.replace(/\[([^\]]+)\]\((.*?)\)/g, (_, text, url) => {
        const safeText = escapeHtml(text);
        if (!isSafeUrl(url)) return safeText; // tampilkan teks saja tanpa link
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline">${safeText}</a>`;
    });

    // 8. INLINE FORMATTING
    html = html.replace(/`([^`\n]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);
    html = html.replace(/^### (.*$)/gim, (_, t) => `<h3>${escapeHtml(t)}</h3>`);
    html = html.replace(/^## (.*$)/gim, (_, t) => `<h2>${escapeHtml(t)}</h2>`);
    html = html.replace(/^# (.*$)/gim, (_, t) => `<h1>${escapeHtml(t)}</h1>`);
    html = html.replace(/\*\*(.*?)\*\*/g, (_, t) => `<strong>${escapeHtml(t)}</strong>`);
    html = html.replace(/\*(.*?)\*/g, (_, t) => `<em>${escapeHtml(t)}</em>`);

    // 9. SMART PARAGRAPH WRAPPER
    const blocks = html.split(/\n{2,}/);
    const parsedBlocks = blocks.map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("__PROTECTED_BLOCK_") || trimmed.startsWith("<h")) {
            return trimmed;
        }
        const textWithBreaks = trimmed.replace(/\n/g, "<br/>");
        return `<p>${textWithBreaks}</p>`;
    });

    html = parsedBlocks.join("\n");

    // 10. BUKA BRANKAS
    protectedBlocks.forEach((blockHtml, index) => {
        html = html.replace(`__PROTECTED_BLOCK_${index}__`, blockHtml);
    });

    return html;
}

export async function POST(req: Request) {
    try {
        const { user, error } = await checkCliToken(req);
        if (error) return error;

        if (!user) {
            return NextResponse.json(
                { message: "Sesi tidak valid! Silakan login ulang di terminal (ntc login)." },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { title: rawTitle, rawContent } = body;

        // Validasi & sanitasi title — ini yang jadi slug dan masuk DB
        const title = sanitizeTitle(rawTitle);
        if (!title) {
            return NextResponse.json(
                { message: "Title tidak valid. Maksimal 200 karakter, tidak boleh mengandung karakter HTML." },
                { status: 400 }
            );
        }

        // Validasi rawContent
        if (!rawContent || typeof rawContent !== "string") {
            return NextResponse.json(
                { message: "Konten tidak valid." },
                { status: 400 }
            );
        }

        if (rawContent.length > 500_000) {
            return NextResponse.json(
                { message: "Konten terlalu besar. Maksimal 500.000 karakter." },
                { status: 400 }
            );
        }

        const htmlContent = parseNtcToHtml(rawContent);


        const deterministicSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        const existingPost = await prisma.post.findFirst({
            where: {
                slug: deterministicSlug,
                authorId: user.id,
            },
        });

        if (existingPost) {
            const existingContentStr =
                typeof existingPost.content === "string"
                    ? existingPost.content
                    : (existingPost.content as any)?.html ||
                    JSON.stringify(existingPost.content);

            if (existingContentStr === htmlContent) {
                return NextResponse.json(
                    {
                        message: "Konten identik.",
                        action: "unchanged",
                        postId: existingPost.id,
                        slug: existingPost.slug,
                    },
                    { status: 200 }
                );
            }

            const updatedPost = await prisma.post.update({
                where: { id: existingPost.id },
                data: { content: { html: htmlContent }, rawContent: rawContent },
            });

            return NextResponse.json(
                { message: "Update", action: "updated", postId: updatedPost.id },
                { status: 200 }
            );
        } else {
            const newPost = await prisma.post.create({
                data: {
                    title: title.replace(/-/g, " "),
                    slug: deterministicSlug,
                    content: { html: htmlContent },
                    rawContent: rawContent,
                    published: false,
                    authorId: user.id,
                },
            });

            return NextResponse.json(
                { message: "Push Baru", action: "created", postId: newPost.id },
                { status: 201 }
            );
        }
    } catch (error) {
        console.error("NTC Upload Error:", error);
        return NextResponse.json(
            { message: "Gagal memproses file .ntc di server." },
            { status: 500 }
        );
    }
}