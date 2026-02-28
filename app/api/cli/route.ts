import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

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
                // Kalau user ngetik "root", berarti filenya dikeluarin dari folder (jadi null)
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
            // Tarik SEMUA artikel milik user ini buat dianalisis
            const allPosts = await prisma.post.findMany({
                where: { authorId: user.id },
                select: { published: true, content: true, createdAt: true }
            });

            const totalPosts = allPosts.length;
            const published = allPosts.filter(p => p.published).length;
            const drafts = totalPosts - published;

            // Variabel penampung analitik
            let totalWords = 0;
            const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

            allPosts.forEach(p => {
                // 1. Ekstrak teks buat ngitung kata
                let text = "";
                if (typeof p.content === 'string') text = p.content;
                else if (p.content && (p.content as any).html) text = (p.content as any).html;

                // Hapus tag HTML biar yang kehitung murni teksnya
                const cleanText = text.replace(/<[^>]*>?/gm, '');
                const words = cleanText.split(/\s+/).filter(w => w.length > 0);
                totalWords += words.length;

                // 2. Hitung hari apa dia paling sering nulis (0 = Minggu, 1 = Senin, dst)
                const day = new Date(p.createdAt).getDay();
                dayCounts[day]++;
            });

            // Cari hari dengan jumlah postingan terbanyak
            const daysMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const activeDayIndex = Object.keys(dayCounts).reduce((a, b) => dayCounts[parseInt(a)] > dayCounts[parseInt(b)] ? a : b);
            const activeDay = dayCounts[parseInt(activeDayIndex)] > 0 ? daysMap[parseInt(activeDayIndex)] : "Belum ada data";

            return NextResponse.json({
                type: "neofetch", // Tipe khusus buat frontend
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

            // Bersihin tag HTML buat jadi format text/markdown sederhana
            let mdContent = `# ${post.title}\n\n`;
            if (typeof post.content === 'string') {
                mdContent += post.content;
            } else if (post.content && (post.content as any).html) {
                // Hapus tag HTML dasar (fallback ringan)
                mdContent += (post.content as any).html.replace(/<[^>]*>?/gm, '');
            }

            const filename = `${post.slug || 'export'}.md`;

            return NextResponse.json({
                type: "download",
                data: {
                    filename: filename,
                    content: mdContent,
                    mimeType: "text/markdown"
                },
                message: `Berhasil mengekspor artikel: ${post.title}`
            }, { status: 200 });
        }

        // --- 8. COMMAND: backup db --all ---
        // --- 8. COMMAND: backup db --all (atau -all) ---
        if (keyword === "backup") {
            // Cek apakah dia ngetik 'db' dan ada flag all (baik minus satu atau dua)
            if (parts[1] === "db" && (parts.includes("--all") || parts.includes("-all"))) {
                // Tarik semua data berharga lu!
                const allPosts = await prisma.post.findMany({ where: { authorId: user.id } });
                const allFolders = await prisma.folder.findMany({ where: { userId: user.id } });

                const backupData = {
                    timestamp: new Date().toISOString(),
                    user: user.email,
                    system: "NoteOS v1.0",
                    data: {
                        folders: allFolders,
                        posts: allPosts
                    }
                };

                const filename = `backup_noteos_${new Date().toISOString().split('T')[0]}.json`;

                return NextResponse.json({
                    type: "download",
                    data: {
                        filename: filename,
                        content: JSON.stringify(backupData, null, 2), // Format JSON rapi
                        mimeType: "application/json"
                    },
                    message: `Database berhasil di-backup. Total: ${allPosts.length} artikel, ${allFolders.length} folder.`
                }, { status: 200 });
            } else {
                // Kasih tau kalau sintaksnya kurang lengkap
                return NextResponse.json({ type: "error", message: "Sintaks salah! Gunakan: backup db --all" }, { status: 400 });
            }
        }

        // --- 9. COMMAND: grep <keyword> ---
        if (keyword === "grep") {
            // Gabungin semua kata setelah 'grep' biar bisa nyari kalimat panjang
            const searchTerm = parts.slice(1).join(" ").toLowerCase();

            if (!searchTerm) {
                return NextResponse.json({ type: "error", message: "Sintaks salah! Gunakan: grep <kata_kunci>" }, { status: 400 });
            }

            // Tarik semua artikel (karena kita harus ngecek isinya satu-satu)
            const allPosts = await prisma.post.findMany({
                where: { authorId: user.id },
                select: { id: true, title: true, slug: true, content: true, published: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' }
            });

            // Logika brutal buat nyari kata di dalam isi artikel
            const matchedPosts = allPosts.filter(p => {
                let text = "";
                // Ekstrak teks mentah dari Tiptap JSON atau HTML lu
                if (typeof p.content === 'string') text = p.content;
                else if (p.content && (p.content as any).html) text = (p.content as any).html;
                else text = JSON.stringify(p.content); // Fallback sapu jagat

                // Cek apakah ada kata yang cocok di isi teks ATAU di judulnya sekalian
                return text.toLowerCase().includes(searchTerm) || p.title.toLowerCase().includes(searchTerm);
            });

            // Buang field 'content' dari hasil biar nggak menuh-menuhin memori browser
            const results = matchedPosts.map(({ content, ...rest }) => rest);

            return NextResponse.json({
                type: "table",
                message: `Memindai isi database... Menemukan ${results.length} artikel yang mengandung teks "${searchTerm}".`,
                data: results,
                // KITA KASIH BONUS: Hasil grep langsung dapet tombol Edit & Trash!
                config: { canEdit: true, canTrash: true }
            }, { status: 200 });
        }
        // --- 10. COMMAND: mkdir <nama_folder> ---
        if (keyword === "mkdir") {
            const folderName = parts.slice(1).join(" "); // Gabung kata biar bisa spasi, cth: mkdir React JS

            if (!folderName) {
                return NextResponse.json({ type: "error", message: "Sintaks salah! Gunakan: mkdir <nama_folder>" }, { status: 400 });
            }

            try {
                await prisma.folder.create({
                    data: {
                        name: folderName,
                        userId: user.id // Asumsi di model Folder lu pakai userId (bukan authorId)
                    }
                });
                return NextResponse.json({ type: "success", message: `Direktori '${folderName}' berhasil diciptakan dalam sistem.` }, { status: 200 });
            } catch (e) {
                return NextResponse.json({ type: "error", message: "Gagal membuat direktori. Mungkin nama sudah ada." }, { status: 500 });
            }
        }

        // --- 11. COMMAND: rmdir <nama_folder> [--force] ---
        if (keyword === "rmdir") {
            const isForce = parts.includes("--force");
            // Ambil nama folder aja, buang flag --force dari string
            const folderNameParts = parts.slice(1).filter((p: any) => p !== "--force");
            const folderName = folderNameParts.join(" ");

            if (!folderName) {
                return NextResponse.json({ type: "error", message: "Sintaks salah! Gunakan: rmdir <nama_folder> [--force]" }, { status: 400 });
            }

            try {
                // Cari folder spesifik milik user ini
                const folder = await prisma.folder.findFirst({
                    where: { name: folderName, userId: user.id }
                });

                if (!folder) return NextResponse.json({ type: "error", message: `Direktori '${folderName}' tidak ditemukan di sistem.` }, { status: 404 });

                // Hitung ada berapa artikel di dalam folder itu
                const postsInFolder = await prisma.post.count({ where: { folderId: folder.id } });

                // SAFETY FEATURE: Kalau folder ada isinya dan lu gak pake --force, server nolak!
                if (postsInFolder > 0 && !isForce) {
                    return NextResponse.json({
                        type: "error",
                        message: `Akses ditolak. Direktori tidak kosong (${postsInFolder} artikel). Gunakan flag --force untuk menghapus paksa.`
                    }, { status: 400 });
                }

                // BRUTAL MODE: Kalau di-force, lumat semua artikel di dalemnya!
                if (isForce && postsInFolder > 0) {
                    await prisma.post.deleteMany({ where: { folderId: folder.id } });
                }

                // Eksekusi akhir: Hapus foldernya
                await prisma.folder.delete({ where: { id: folder.id } });

                return NextResponse.json({
                    type: "success",
                    message: isForce
                        ? `MODE BRUTAL: Direktori '${folderName}' beserta ${postsInFolder} isinya hangus terbakar! 🔥`
                        : `Direktori '${folderName}' berhasil dihapus dengan bersih.`
                }, { status: 200 });

            } catch (e) {
                return NextResponse.json({ type: "error", message: "Kesalahan server saat mencoba menghapus direktori." }, { status: 500 });
            }
        }
        // --- 12. COMMAND: dir (List Folders) ---
        if (keyword === "dir") {
            try {
                // Tarik semua folder milik user ini, PLUS hitung jumlah artikel di dalemnya!
                const folders = await prisma.folder.findMany({
                    where: { userId: user.id },
                    include: {
                        _count: {
                            select: { posts: true } // Asumsi relasi artikel ke folder bernama 'posts'
                        }
                    },
                    orderBy: { name: 'asc' } // Urutkan sesuai abjad A-Z
                });

                // Format ulang datanya biar cocok masuk ke UI Tabel 'TerminalResultModal' lu
                const formattedFolders = folders.map(f => ({
                    id: f.id,
                    title: `📁 ${f.name} — (${f._count?.posts || 0} file)`, // Nama digabung jumlah isinya
                    slug: f.name.toLowerCase().replace(/\s+/g, '-'),
                    published: true, // Dipaksa true biar statusnya hijau elegan di tabel
                    createdAt: (f as any).createdAt || new Date()
                }));

                return NextResponse.json({
                    type: "table",
                    message: `Memindai direktori... Ditemukan ${formattedFolders.length} folder di dalam sistem.`,
                    data: formattedFolders,
                    config: { canEdit: false, canTrash: true } // Kita kasih tombol Trash sekalian!
                }, { status: 200 });

            } catch (error) {
                return NextResponse.json({ type: "error", message: "Gagal memindai direktori." }, { status: 500 });
            }
        }
        // --- 13. COMMAND: ping ---
        if (keyword === "ping") {
            const start = Date.now();
            try {
                // Tembak query paling ringan ke DB cuma buat ngetes respon
                await prisma.user.count();
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
            // Susun data rahasia user buat ditampilin
            const userData = {
                username: user.name || "admin",
                email: user.email,
                userId: user.id,
                role: "Superadmin (Root)",
                systemAccess: "Granted",
                loginTime: new Date().toISOString()
            };

            return NextResponse.json({
                type: "code", // Tipe baru khusus nampilin JSON mentah
                data: JSON.stringify(userData, null, 4) // Format JSON biar rapi ada indentasinya
            }, { status: 200 });
        }
        // --- 15. COMMAND: sweep drafts ---
        if (keyword === "sweep") {
            if (parts[1] !== "drafts") {
                return NextResponse.json({ type: "error", message: "Sintaks salah! Gunakan: sweep drafts" }, { status: 400 });
            }

            // Tarik semua artikel yang statusnya DRAFT
            const drafts = await prisma.post.findMany({
                where: { authorId: user.id, published: false },
                select: { id: true, content: true }
            });

            // Filter super ketat: Cari draf yang Bener-Bener Kosong
            const emptyDraftIds = drafts.filter(p => {
                if (!p.content) return true;

                // Ubah konten jadi string biar gampang dicek
                const contentStr = typeof p.content === 'string' ? p.content : JSON.stringify(p.content);

                // Bersihin dari tag HTML dan karakter aneh. Kalau sisa panjang hurufnya 0, berarti KOSONG.
                const cleanText = contentStr.replace(/<[^>]*>?/gm, '').replace(/[^a-zA-Z0-9]/g, '');

                // Cek juga format kosong bawaan Tiptap
                return cleanText.length === 0 || contentStr === "{}" || contentStr === '{"type":"doc","content":[{"type":"paragraph"}]}';
            }).map(p => p.id); // Ambil ID-nya aja

            // Kalau gak ada sampah, laporin aman
            if (emptyDraftIds.length === 0) {
                return NextResponse.json({ type: "info", message: "Sistem bersih. Tidak ada draf kosong yang perlu disapu." }, { status: 200 });
            }

            // Eksekusi pemusnahan massal!
            await prisma.post.deleteMany({
                where: { id: { in: emptyDraftIds } }
            });

            return NextResponse.json({
                type: "success",
                message: `Sapu bersih! 🧹 ${emptyDraftIds.length} draf kosong/sampah berhasil dilenyapkan dari database.`
            }, { status: 200 });
        }
        // 2. COMMAND: show post
        if (keyword === "show" && parts[1] === "post") {
            let whereClause: any = { authorId: user.id };

            // Cek Flag -n (New / Hari ini)
            if (parts.includes("-n")) {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                whereClause.createdAt = { gte: startOfDay };
            }

            // Cek Flag -e content (Empty Content)
            if (parts.includes("-e") && parts.includes("content")) {
                whereClause.content = { equals: {} };
            }

            // Cek Flag -rg prev -X
            const rgIndex = parts.indexOf("-rg");
            if (rgIndex !== -1 && parts[rgIndex + 1] === "prev" && parts[rgIndex + 2]) {
                const daysBack = Math.abs(parseInt(parts[rgIndex + 2]));
                if (!isNaN(daysBack)) {
                    const pastDate = new Date();
                    pastDate.setDate(pastDate.getDate() - daysBack);
                    whereClause.createdAt = { gte: pastDate };
                }
            }

            // --- FITUR BRUTAL BARU: DETEKSI FLAG AKSI ---
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
                // Kirim konfigurasi aksi ke UI Modal!
                config: { canEdit, canTrash }
            }, { status: 200 });
        }

        return NextResponse.json({ type: "error", message: "Perintah tidak dikenali oleh server." }, { status: 400 });

    } catch (error) {
        console.error("CLI Error:", error);
        return NextResponse.json({ type: "error", message: "Gagal mengeksekusi perintah sistem." }, { status: 500 });
    }
}