import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// Batas maksimal artikel yang boleh dihapus sekaligus dengan --force
const RMDIR_FORCE_MAX_POSTS = 10;

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ message: "Akses ditolak" }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });

        const { rawCommand } = await req.json();
        const parts = rawCommand.trim().split(/\s+/);
        const keyword = parts[0].toLowerCase();

        // 1. COMMAND: ls
        if (keyword === "ls") {
            const posts = await prisma.post.findMany({
                where: { authorId: user.id },
                select: { id: true, title: true, slug: true, updatedAt: true, published: true },
                orderBy: { updatedAt: 'desc' }
            });
            return NextResponse.json({ type: "table", data: posts }, { status: 200 });
        }

        // --- 3. COMMAND: publish <id> ---
        if (keyword === "publish" && parts[1]) {
            const postId = parts[1];
            try {
                await prisma.post.update({
                    where: { id: postId, authorId: user.id },
                    data: { published: true }
                });
                return NextResponse.json({ type: "success", message: `Akses dibuka. Artikel dengan ID [${postId.slice(-6)}] berhasil mengudara.` }, { status: 200 });
            } catch (e) {
                return NextResponse.json({ type: "error", message: `Gagal. Artikel ID [${postId.slice(-6)}] tidak ditemukan.` }, { status: 400 });
            }
        }

        // --- 4. COMMAND: unpublish / draft <id> ---
        if ((keyword === "unpublish" || keyword === "draft") && parts[1]) {
            const postId = parts[1];
            try {
                await prisma.post.update({
                    where: { id: postId, authorId: user.id },
                    data: { published: false }
                });
                return NextResponse.json({ type: "success", message: `Akses ditutup. Artikel ID [${postId.slice(-6)}] ditarik kembali ke Draf.` }, { status: 200 });
            } catch (e) {
                return NextResponse.json({ type: "error", message: `Gagal ditarik. Artikel ID tidak valid.` }, { status: 400 });
            }
        }

        // --- 5. COMMAND: mv <id> --to <folderId> ---
        if (keyword === "mv" && parts[1]) {
            const postId = parts[1];
            const toIndex = parts.indexOf("--to");

            if (toIndex !== -1 && parts[toIndex + 1]) {
                const targetFolder = parts[toIndex + 1] === "root" ? null : parts[toIndex + 1];
                try {
                    await prisma.post.update({
                        where: { id: postId, authorId: user.id },
                        data: { folderId: targetFolder }
                    });
                    return NextResponse.json({ type: "success", message: `Berhasil. Artikel ID [${postId.slice(-6)}] dipindahkan ke ${targetFolder ? 'folder baru' : 'root / luar'}.` }, { status: 200 });
                } catch (e) {
                    return NextResponse.json({ type: "error", message: "Gagal memindahkan artikel. Cek ID artikel/folder." }, { status: 400 });
                }
            } else {
                return NextResponse.json({ type: "error", message: "Sintaks tidak lengkap. Gunakan format: mv <id> --to <folder_id>" }, { status: 400 });
            }
        }

        // --- 6. COMMAND: stats / neofetch ---
        if (keyword === "stats" || keyword === "neofetch") {
            const allPosts = await prisma.post.findMany({
                where: { authorId: user.id },
                select: { published: true, content: true, createdAt: true }
            });

            const totalPosts = allPosts.length;
            const published = allPosts.filter(p => p.published).length;
            const drafts = totalPosts - published;

            let totalWords = 0;
            const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

            allPosts.forEach(p => {
                let text = "";
                if (typeof p.content === 'string') text = p.content;
                else if (p.content && (p.content as any).html) text = (p.content as any).html;

                const cleanText = text.replace(/<[^>]*>?/gm, '');
                const words = cleanText.split(/\s+/).filter(w => w.length > 0);
                totalWords += words.length;

                const day = new Date(p.createdAt).getDay();
                dayCounts[day]++;
            });

            const daysMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const activeDayIndex = Object.keys(dayCounts).reduce((a, b) => dayCounts[parseInt(a)] > dayCounts[parseInt(b)] ? a : b);
            const activeDay = dayCounts[parseInt(activeDayIndex)] > 0 ? daysMap[parseInt(activeDayIndex)] : "Belum ada data";

            return NextResponse.json({
                type: "neofetch",
                data: {
                    user: user.name || user.email?.split('@')[0] || "admin",
                    os: "NoteOS v1.0 (Next.js)",
                    db: "PostgreSQL (Prisma)",
                    totalPosts,
                    published,
                    drafts,
                    totalWords,
                    activeDay
                }
            }, { status: 200 });
        }

        // --- 7. COMMAND: export post <id> ---
        if (keyword === "export" && parts[1] === "post" && parts[2]) {
            const postId = parts[2];
            const post = await prisma.post.findUnique({
                where: { id: postId, authorId: user.id }
            });

            if (!post) {
                return NextResponse.json({ type: "error", message: `Artikel ID [${postId.slice(-6)}] tidak ditemukan.` }, { status: 404 });
            }

            let mdContent = `# ${post.title}\n\n`;
            if (typeof post.content === 'string') {
                mdContent += post.content;
            } else if (post.content && (post.content as any).html) {
                mdContent += (post.content as any).html.replace(/<[^>]*>?/gm, '');
            }

            return NextResponse.json({
                type: "download",
                data: {
                    filename: `${post.slug || 'export'}.md`,
                    content: mdContent,
                    mimeType: "text/markdown"
                },
                message: `Berhasil mengekspor artikel: ${post.title}`
            }, { status: 200 });
        }

        // --- 8. COMMAND: backup db --all ---
        if (keyword === "backup") {
            if (parts[1] === "db" && (parts.includes("--all") || parts.includes("-all"))) {
                const allPosts = await prisma.post.findMany({ where: { authorId: user.id } });
                const allFolders = await prisma.folder.findMany({ where: { userId: user.id } });

                const backupData = {
                    timestamp: new Date().toISOString(),
                    user: user.email,
                    system: "NoteOS v1.0",
                    data: { folders: allFolders, posts: allPosts }
                };

                return NextResponse.json({
                    type: "download",
                    data: {
                        filename: `backup_noteos_${new Date().toISOString().split('T')[0]}.json`,
                        content: JSON.stringify(backupData, null, 2),
                        mimeType: "application/json"
                    },
                    message: `Database berhasil di-backup. Total: ${allPosts.length} artikel, ${allFolders.length} folder.`
                }, { status: 200 });
            } else {
                return NextResponse.json({ type: "error", message: "Sintaks salah! Gunakan: backup db --all" }, { status: 400 });
            }
        }

        // --- 9. COMMAND: grep <keyword> ---
        if (keyword === "grep") {
            const searchTerm = parts.slice(1).join(" ").toLowerCase();

            if (!searchTerm) {
                return NextResponse.json({ type: "error", message: "Sintaks salah! Gunakan: grep <kata_kunci>" }, { status: 400 });
            }

            const allPosts = await prisma.post.findMany({
                where: { authorId: user.id },
                select: { id: true, title: true, slug: true, content: true, published: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' }
            });

            const matchedPosts = allPosts.filter(p => {
                let text = "";
                if (typeof p.content === 'string') text = p.content;
                else if (p.content && (p.content as any).html) text = (p.content as any).html;
                else text = JSON.stringify(p.content);
                return text.toLowerCase().includes(searchTerm) || p.title.toLowerCase().includes(searchTerm);
            });

            const results = matchedPosts.map(({ content, ...rest }) => rest);

            return NextResponse.json({
                type: "table",
                message: `Memindai isi database... Menemukan ${results.length} artikel yang mengandung teks "${searchTerm}".`,
                data: results,
                config: { canEdit: true, canTrash: true }
            }, { status: 200 });
        }

        // --- 10. COMMAND: mkdir <nama_folder> ---
        if (keyword === "mkdir") {
            const folderName = parts.slice(1).join(" ");

            if (!folderName) {
                return NextResponse.json({ type: "error", message: "Sintaks salah! Gunakan: mkdir <nama_folder>" }, { status: 400 });
            }

            try {
                await prisma.folder.create({
                    data: { name: folderName, userId: user.id }
                });
                return NextResponse.json({ type: "success", message: `Direktori '${folderName}' berhasil diciptakan dalam sistem.` }, { status: 200 });
            } catch (e) {
                return NextResponse.json({ type: "error", message: "Gagal membuat direktori. Mungkin nama sudah ada." }, { status: 500 });
            }
        }

        // --- 11. COMMAND: rmdir <nama_folder> [--force] [--confirm=<nama>] ---
        if (keyword === "rmdir") {
            const isForce = parts.includes("--force");

            // Ambil nama folder — buang flag --force dan --confirm=... dari string
            const folderNameParts = parts
                .slice(1)
                .filter((p: string) => p !== "--force" && !p.startsWith("--confirm="));
            const folderName = folderNameParts.join(" ");

            if (!folderName) {
                return NextResponse.json({
                    type: "error",
                    message: "Sintaks salah! Gunakan: rmdir <nama_folder> [--force --confirm=<nama_folder>]"
                }, { status: 400 });
            }

            // Cari folder milik user ini
            const folder = await prisma.folder.findFirst({
                where: { name: folderName, userId: user.id }
            });

            if (!folder) {
                return NextResponse.json({
                    type: "error",
                    message: `Direktori '${folderName}' tidak ditemukan di sistem.`
                }, { status: 404 });
            }

            // Ambil semua artikel di dalam folder ini
            const postsInFolder = await prisma.post.findMany({
                where: { folderId: folder.id },
                select: { id: true, title: true, published: true }
            });

            const postCount = postsInFolder.length;

            // Folder kosong — hapus langsung tanpa syarat
            if (postCount === 0) {
                await prisma.folder.delete({ where: { id: folder.id } });
                return NextResponse.json({
                    type: "success",
                    message: `Direktori '${folderName}' berhasil dihapus dengan bersih.`
                }, { status: 200 });
            }

            // Folder berisi — butuh --force
            if (!isForce) {
                return NextResponse.json({
                    type: "error",
                    message: `Akses ditolak. Direktori tidak kosong (${postCount} artikel). Gunakan flag --force --confirm=${folderName} untuk menghapus paksa.`
                }, { status: 400 });
            }

            // ── SAFEGUARD 1: Tolak kalau ada artikel yang sudah published ──────
            const publishedPosts = postsInFolder.filter(p => p.published);
            if (publishedPosts.length > 0) {
                const titles = publishedPosts.map(p => `"${p.title}"`).join(", ");
                return NextResponse.json({
                    type: "error",
                    message: `Ditolak. Folder ini mengandung ${publishedPosts.length} artikel yang sudah LIVE: ${titles}. Unpublish dulu sebelum menghapus folder.`
                }, { status: 400 });
            }

            // ── SAFEGUARD 2: Tolak kalau melebihi batas maksimal artikel ────────
            if (postCount > RMDIR_FORCE_MAX_POSTS) {
                return NextResponse.json({
                    type: "error",
                    message: `Ditolak. Folder ini mengandung ${postCount} artikel, melebihi batas maksimal ${RMDIR_FORCE_MAX_POSTS} untuk operasi --force. Pindahkan sebagian artikel dulu dengan perintah mv.`
                }, { status: 400 });
            }

            // ── SAFEGUARD 3: Konfirmasi eksplisit via --confirm=<nama_folder> ───
            const confirmPart = parts.find((p: string) => p.startsWith("--confirm="));
            const confirmValue = confirmPart?.split("=").slice(1).join("=") ?? "";

            if (confirmValue !== folderName) {
                return NextResponse.json({
                    type: "error",
                    message: `Konfirmasi diperlukan. Jalankan ulang dengan: rmdir ${folderName} --force --confirm=${folderName}`
                }, { status: 400 });
            }

            // ── SAFEGUARD 4: Catat log audit sebelum eksekusi ───────────────────
            // Snapshot disimpan dulu — kalau delete gagal di tengah jalan,
            // log tetap ada sebagai referensi apa yang seharusnya terhapus
            await prisma.deleteLog.create({
                data: {
                    userId: user.id,
                    folderName: folder.name,
                    folderId: folder.id,
                    postCount,
                    postTitles: postsInFolder.map(p => p.title),
                }
            });

            // Eksekusi — hapus folder (Cascade di schema hapus posts di dalamnya)
            await prisma.folder.delete({ where: { id: folder.id } });

            return NextResponse.json({
                type: "success",
                message: `Direktori '${folderName}' beserta ${postCount} draf di dalamnya telah dihapus. Log aktivitas telah dicatat.`
            }, { status: 200 });
        }

        // --- 12. COMMAND: dir ---
        if (keyword === "dir") {
            try {
                const folders = await prisma.folder.findMany({
                    where: { userId: user.id },
                    include: { _count: { select: { posts: true } } },
                    orderBy: { name: 'asc' }
                });

                const formattedFolders = folders.map(f => ({
                    id: f.id,
                    title: `📁 ${f.name} — (${f._count?.posts || 0} file)`,
                    slug: f.name.toLowerCase().replace(/\s+/g, '-'),
                    published: true,
                    createdAt: (f as any).createdAt || new Date()
                }));

                return NextResponse.json({
                    type: "table",
                    message: `Memindai direktori... Ditemukan ${formattedFolders.length} folder di dalam sistem.`,
                    data: formattedFolders,
                    config: { canEdit: false, canTrash: true }
                }, { status: 200 });
            } catch (error) {
                return NextResponse.json({ type: "error", message: "Gagal memindai direktori." }, { status: 500 });
            }
        }

        // --- 13. COMMAND: ping ---
        if (keyword === "ping") {
            const start = Date.now();
            try {
                // Query ke tabel kecil milik user sendiri — tidak expose info global
                await prisma.folder.count({ where: { userId: user.id } });
                const latency = Date.now() - start;
                return NextResponse.json({
                    type: "success",
                    message: `Reply from PostgreSQL: bytes=32 time=${latency}ms status=Healthy 🟢`
                }, { status: 200 });
            } catch (error) {
                return NextResponse.json({ type: "error", message: "Request timed out. Gagal menghubungi database." }, { status: 500 });
            }
        }

        // --- 14. COMMAND: whoami ---
        if (keyword === "whoami") {
            // Hanya tampilkan data yang aman — tidak expose userId
            const userData = {
                username: user.name || "admin",
                email: user.email,
                handle: user.handle || "-",
                loginTime: new Date().toISOString()
            };

            return NextResponse.json({
                type: "code",
                data: JSON.stringify(userData, null, 4)
            }, { status: 200 });
        }

        // --- 15. COMMAND: sweep drafts ---
        if (keyword === "sweep") {
            if (parts[1] !== "drafts") {
                return NextResponse.json({ type: "error", message: "Sintaks salah! Gunakan: sweep drafts" }, { status: 400 });
            }

            const drafts = await prisma.post.findMany({
                where: { authorId: user.id, published: false },
                select: { id: true, content: true }
            });

            const emptyDraftIds = drafts.filter(p => {
                if (!p.content) return true;
                const contentStr = typeof p.content === 'string' ? p.content : JSON.stringify(p.content);
                const cleanText = contentStr.replace(/<[^>]*>?/gm, '').replace(/[^a-zA-Z0-9]/g, '');
                return cleanText.length === 0 || contentStr === "{}" || contentStr === '{"type":"doc","content":[{"type":"paragraph"}]}';
            }).map(p => p.id);

            if (emptyDraftIds.length === 0) {
                return NextResponse.json({ type: "info", message: "Sistem bersih. Tidak ada draf kosong yang perlu disapu." }, { status: 200 });
            }

            await prisma.post.deleteMany({ where: { id: { in: emptyDraftIds } } });

            return NextResponse.json({
                type: "success",
                message: `Sapu bersih! 🧹 ${emptyDraftIds.length} draf kosong/sampah berhasil dilenyapkan dari database.`
            }, { status: 200 });
        }

        // --- 2. COMMAND: show post ---
        if (keyword === "show" && parts[1] === "post") {
            let whereClause: any = { authorId: user.id };

            if (parts.includes("-n")) {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                whereClause.createdAt = { gte: startOfDay };
            }

            if (parts.includes("-e") && parts.includes("content")) {
                whereClause.content = { equals: {} };
            }

            const rgIndex = parts.indexOf("-rg");
            if (rgIndex !== -1 && parts[rgIndex + 1] === "prev" && parts[rgIndex + 2]) {
                const daysBack = Math.abs(parseInt(parts[rgIndex + 2]));
                if (!isNaN(daysBack)) {
                    const pastDate = new Date();
                    pastDate.setDate(pastDate.getDate() - daysBack);
                    whereClause.createdAt = { gte: pastDate };
                }
            }

            const canEdit = parts.includes("--edit");
            const canTrash = parts.includes("--trash") || parts.includes("--delete");

            const results = await prisma.post.findMany({
                where: whereClause,
                select: { id: true, title: true, slug: true, createdAt: true, published: true },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json({
                type: "table",
                message: `Ditemukan ${results.length} postingan sesuai kriteria.`,
                data: results,
                config: { canEdit, canTrash }
            }, { status: 200 });
        }

        return NextResponse.json({ type: "error", message: "Perintah tidak dikenali oleh server." }, { status: 400 });

    } catch (error) {
        console.error("CLI Error:", error);
        return NextResponse.json({ type: "error", message: "Gagal mengeksekusi perintah sistem." }, { status: 500 });
    }
}