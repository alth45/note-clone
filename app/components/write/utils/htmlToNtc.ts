// utils/htmlToNtc.ts
// Konversi HTML Tiptap → format teks .ntc.
// Kebalikan dari parseNtcToHtml di server (app/api/ntc-upload/route.ts).
// Pure functions — tidak ada React/browser dependency selain string manipulation.

export function htmlToNtc(html: string): string {
    let text = html;

    // ── Code blocks ───────────────────────────────────────────────────────────
    text = text.replace(
        /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gi,
        (_, lang, code) => {
            const language = lang || "";
            const decoded = decodeHtmlEntities(code);
            return `\n\`\`\`${language}\n${decoded.trim()}\n\`\`\`\n`;
        }
    );

    // ── Slide embeds ──────────────────────────────────────────────────────────
    text = text.replace(
        /<div[^>]*class="[^"]*slide-wrapper[^"]*"[^>]*>[\s\S]*?src="([^"]*)"[\s\S]*?<\/div>/gi,
        (_, src) => `\n:::SLIDE\n${src}\n:::\n`
    );

    // ── Images — figure + figcaption ─────────────────────────────────────────
    text = text.replace(
        /<figure[^>]*>[\s\S]*?<img[^>]+src="([^"]*)"[^>]*>[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/gi,
        (_, src, caption) => `\n:::IMAGE\n${src}\n${caption.trim()}\n:::\n`
    );
    text = text.replace(
        /<figure[^>]*>[\s\S]*?<img[^>]+src="([^"]*)"[^>]*>[\s\S]*?<\/figure>/gi,
        (_, src) => `\n:::IMAGE\n${src}\n:::\n`
    );
    text = text.replace(/<img[^>]+src="([^"]*)"[^>]*>/gi, "![]($1)");

    // ── Tables ────────────────────────────────────────────────────────────────
    text = text.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
        const rows: string[] = [];
        const rowMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        rowMatches.forEach((row, idx) => {
            const cells = [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
                .map((m) => m[1].replace(/<[^>]+>/g, "").trim());
            rows.push("| " + cells.join(" | ") + " |");
            if (idx === 0) rows.push("| " + cells.map(() => "---").join(" | ") + " |");
        });
        return "\n" + rows.join("\n") + "\n";
    });

    // ── Headings ──────────────────────────────────────────────────────────────
    text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
    text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
    text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");

    // ── Blockquote ────────────────────────────────────────────────────────────
    text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
        const stripped = inner.replace(/<[^>]+>/g, "").trim();
        return "\n> " + stripped.split("\n").join("\n> ") + "\n";
    });

    // ── Lists ─────────────────────────────────────────────────────────────────
    text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
        const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
            .map((m) => "- " + m[1].replace(/<[^>]+>/g, "").trim());
        return "\n" + items.join("\n") + "\n";
    });
    text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
        const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
            .map((m, i) => `${i + 1}. ` + m[1].replace(/<[^>]+>/g, "").trim());
        return "\n" + items.join("\n") + "\n";
    });

    // ── Inline formatting ─────────────────────────────────────────────────────
    text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
    text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
    text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
    text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
    text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
    text = text.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

    // ── Paragraphs & line breaks ──────────────────────────────────────────────
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");

    // ── Strip remaining tags & decode entities ────────────────────────────────
    text = text.replace(/<[^>]+>/g, "");
    text = decodeHtmlEntities(text);

    // ── Normalise whitespace ──────────────────────────────────────────────────
    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
}

export function titleToSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}