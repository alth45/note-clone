export type CommandContext = {
    router: any;
    openQuickEditor: (filename: string) => void;
    closePalette: () => void;
    showAlert: (title: string, message: string, type?: "success" | "danger" | "warning") => void; // Update tipe-nya menyesuaikan
    openTerminalResult: (title: string, data: any) => void;
};

export interface CommandDef {
    keyword: string;
    description: string;
    execute: (rawString: string, context: CommandContext) => Promise<void>;
}

// FUNGSI SAKTI BUAT NGEKSEKUSI PERINTAH AKSI (Publish, Unpublish, Mv)
// const runActionCommand = async (rawString: string, context: CommandContext) => {
//     try {
//         const res = await fetch("/api/cli", {
//             method: "POST",
//             body: JSON.stringify({ rawCommand: rawString })
//         });
//         const response = await res.json();

//         context.closePalette();

//         // Cek tipe balikan dari API
//         if (response.type === "success") {
//             context.showAlert("Eksekusi Berhasil", response.message, "success");
//         } else if (response.type === "error") {
//             context.showAlert("Eksekusi Gagal", response.message, "danger");
//         } else {
//             context.showAlert("Info Sistem", "Perintah selesai dijalankan.");
//         }
//     } catch (error) {
//         context.closePalette();
//         context.showAlert("Fatal Error", "Koneksi ke sistem pusat terputus.", "danger");
//     }
// };

// FUNGSI SAKTI BUAT NGEKSEKUSI PERINTAH AKSI & DOWNLOAD
const runActionCommand = async (rawString: string, context: CommandContext) => {
    try {
        const res = await fetch("/api/cli", {
            method: "POST",
            body: JSON.stringify({ rawCommand: rawString })
        });
        const response = await res.json();

        context.closePalette();

        // --- LOGIKA BARU: JIKA SERVER NYURUH DOWNLOAD ---
        if (response.type === "download") {
            const { filename, content, mimeType } = response.data;

            // Sihir Browser: Bikin file virtual di memori, lalu klik otomatis
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            // Bersihin sampah memori
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            context.showAlert("Download Berhasil", response.message, "success");
        }
        // Logika lama tetep jalan
        else if (response.type === "success") {
            context.showAlert("Eksekusi Berhasil", response.message, "success");
        } else if (response.type === "error") {
            context.showAlert("Eksekusi Gagal", response.message, "danger");
        } else {
            context.showAlert("Info Sistem", "Perintah selesai dijalankan.");
        }
    } catch (error) {
        context.closePalette();
        context.showAlert("Fatal Error", "Koneksi ke sistem pusat terputus.", "danger");
    }
};

export const SYSTEM_COMMANDS: CommandDef[] = [
    // --- PERINTAH LOKAL (date, time, pwd, dll tetep sama) ---
    {
        keyword: "date",
        description: "Tampilkan tanggal hari ini",
        execute: async (_, context) => {
            const today = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date());
            context.showAlert("System Date", today);
            context.closePalette();
        }
    },
    {
        keyword: "time",
        description: "Tampilkan jam saat ini",
        execute: async (_, context) => {
            const time = new Intl.DateTimeFormat('id-ID', { timeStyle: 'medium' }).format(new Date());
            context.showAlert("System Time", time);
            context.closePalette();
        }
    },
    {
        keyword: "pwd",
        description: "Tampilkan lokasi direktori saat ini",
        execute: async (_, context) => {
            context.showAlert("Print Working Directory", window.location.pathname || "/");
            context.closePalette();
        }
    },

    // --- PERINTAH TERMINAL HASIL (Tabel) ---
    {
        keyword: "ls",
        description: "List semua direktori dan file artikel",
        execute: async (rawString, context) => {
            try {
                const res = await fetch("/api/cli", { method: "POST", body: JSON.stringify({ rawCommand: rawString }) });
                const response = await res.json();
                context.closePalette();
                if (response.type === "table") context.openTerminalResult(`Hasil: ${rawString}`, response);
            } catch (error) {
                context.showAlert("Error", "Gagal menghubungi server database.", "danger");
            }
        }
    },
    {
        keyword: "show",
        description: "Filter data presisi tinggi (Cth: show post -rg prev -3 -e content)",
        execute: async (rawString, context) => {
            try {
                const res = await fetch("/api/cli", { method: "POST", body: JSON.stringify({ rawCommand: rawString }) });
                const response = await res.json();
                context.closePalette();
                if (response.type === "table") context.openTerminalResult(`Eksekusi: ${rawString}`, response);
                else context.showAlert("CLI Error", response.message, "danger");
            } catch (error) {
                context.showAlert("Fatal Error", "Koneksi ke sistem pusat terputus.", "danger");
            }
        }
    },

    {
        keyword: "stats",
        description: "Tampilkan statistik sistem & analitik menulis ala neofetch",
        execute: async (rawString, context) => {
            try {
                const res = await fetch("/api/cli", { method: "POST", body: JSON.stringify({ rawCommand: rawString }) });
                const response = await res.json();

                context.closePalette();
                if (response.type === "neofetch") {
                    context.openTerminalResult(`System Analytics / Stats`, response);
                } else {
                    context.showAlert("CLI Error", response.message || "Gagal memuat analitik.", "danger");
                }
            } catch (error) {
                context.closePalette();
                context.showAlert("Fatal Error", "Koneksi ke sistem pusat terputus.", "danger");
            }
        }
    },
    {
        keyword: "neofetch",
        description: "Alias untuk perintah stats",
        execute: async (rawString, context) => {
            // Re-use logic yang sama persis kayak stats
            const statsCommand = SYSTEM_COMMANDS.find(c => c.keyword === "stats");
            if (statsCommand) await statsCommand.execute("stats", context);
        }
    },
    {
        keyword: "grep",
        description: "Scan seluruh isi artikel mencari teks spesifik (Cth: grep react server components)",
        execute: async (rawString, context) => {
            try {
                const res = await fetch("/api/cli", {
                    method: "POST",
                    body: JSON.stringify({ rawCommand: rawString })
                });
                const response = await res.json();

                context.closePalette();

                if (response.type === "table") {
                    // Pakai ulang UI TerminalResultModal lu yang canggih itu!
                    context.openTerminalResult(`System Grep: ${rawString}`, response);
                } else {
                    context.showAlert("CLI Error", response.message, "danger");
                }
            } catch (error) {
                context.closePalette();
                context.showAlert("Fatal Error", "Gagal melakukan pemindaian. Koneksi terputus.", "danger");
            }
        }
    },
    // --- PERINTAH FILE SYSTEM (The Linux Hacker) ---
    {
        keyword: "dir",
        description: "List semua direktori/folder beserta jumlah isinya (Cth: dir)",
        execute: async (rawString, context) => {
            try {
                const res = await fetch("/api/cli", {
                    method: "POST",
                    body: JSON.stringify({ rawCommand: rawString })
                });
                const response = await res.json();

                context.closePalette();
                if (response.type === "table") {
                    context.openTerminalResult(`List Direktori`, response);
                } else {
                    context.showAlert("CLI Error", response.message, "danger");
                }
            } catch (error) {
                context.closePalette();
                context.showAlert("Fatal Error", "Koneksi ke sistem pusat terputus.", "danger");
            }
        }
    },
    // --- PERINTAH DIAGNOSTIK JARINGAN & SISTEM ---
    {
        keyword: "ping",
        description: "Cek latency & status koneksi ke database (Cth: ping)",
        execute: async (rawString, context) => {
            try {
                const res = await fetch("/api/cli", { method: "POST", body: JSON.stringify({ rawCommand: rawString }) });
                const response = await res.json();

                context.closePalette();
                if (response.type === "success") {
                    // Cukup pake alert hijau di pojok kanan atas, biar kerasa cepet!
                    context.showAlert("Status Jaringan", response.message, "success");
                } else {
                    context.showAlert("Ping Gagal", response.message, "danger");
                }
            } catch (error) {
                context.closePalette();
                context.showAlert("Fatal Error", "Koneksi terputus.", "danger");
            }
        }
    },
    {
        keyword: "whoami",
        description: "Tampilkan informasi sesi rahasia user saat ini (Cth: whoami)",
        execute: async (rawString, context) => {
            try {
                const res = await fetch("/api/cli", { method: "POST", body: JSON.stringify({ rawCommand: rawString }) });
                const response = await res.json();

                context.closePalette();
                if (response.type === "code") {
                    context.openTerminalResult(`System Info`, response);
                }
            } catch (error) {
                context.closePalette();
                context.showAlert("Fatal Error", "Gagal memuat sesi.", "danger");
            }
        }
    },
    // --- PERINTAH CLEANER (Manajemen Sampah & Memori) ---
    {
        keyword: "sweep",
        description: "Hapus massal semua draf artikel yang isinya kosong (Cth: sweep drafts)",
        execute: async (rawString, context) => {
            try {
                const res = await fetch("/api/cli", { method: "POST", body: JSON.stringify({ rawCommand: rawString }) });
                const response = await res.json();

                context.closePalette();
                if (response.type === "success") {
                    context.showAlert("Sweep Berhasil", response.message, "success");
                } else if (response.type === "info") {
                    context.showAlert("Sistem Bersih", response.message, "success");
                } else {
                    context.showAlert("Gagal", response.message || "Sintaks salah.", "danger");
                }
            } catch (error) {
                context.closePalette();
                context.showAlert("Fatal Error", "Koneksi terputus.", "danger");
            }
        }
    },
    {
        keyword: "clear",
        description: "Bersihkan cache browser dan muat ulang sistem (Cth: clear cache)",
        execute: async (rawString, context) => {
            const parts = rawString.trim().split(/\s+/);
            context.closePalette();

            if (parts[1] === "cache") {
                // Menghapus penyimpanan lokal browser lu
                localStorage.clear();
                sessionStorage.clear();

                context.showAlert("Cache Cleared ⚡", "Memori lokal telah dibersihkan. Memuat ulang sistem...", "success");

                // Refresh halaman otomatis setelah 1.5 detik biar kerasa efeknya
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                context.showAlert("Sintaks Salah", "Gunakan perintah: clear cache", "warning");
            }
        }
    },
    // --- PERINTAH BANTUAN (HELP) ---
    {
        keyword: "help",
        description: "Tampilkan semua daftar perintah yang tersedia di sistem",
        execute: async (_, context) => {
            // Kita ekstrak semua command secara dinamis dari sistem
            const helpText = SYSTEM_COMMANDS.map(cmd => {
                // Bikin spasinya sejajar biar rapi kayak tabel ASCII
                const paddedKeyword = cmd.keyword.padEnd(15, " ");
                return `> ${paddedKeyword} : ${cmd.description}`;
            }).join("\n");

            // Bikin Header ASCII Art simpel biar makin kerasa terminalnya
            const output = `=========================================================\n` +
                `                 NOTE OS COMMAND CENTER                  \n` +
                `=========================================================\n\n` +
                `Gunakan perintah berikut untuk mengontrol sistem:\n\n` +
                helpText + `\n\n` +
                `=========================================================\n` +
                `Tip: Gunakan panah Atas/Bawah untuk riwayat perintah.`;

            context.closePalette();

            // Kita lempar outputnya pakai tipe "code" biar tampilannya teks hijau hacker!
            context.openTerminalResult("Manual Bantuan Sistem", {
                type: "code",
                data: output
            });
        }
    },

    // --- MANIPULASI CEPAT API (BARU DITAMBAHKAN!) ---
    {
        keyword: "publish",
        description: "Publikasi artikel instan (Cth: publish clx123...)",
        execute: runActionCommand
    },
    {
        keyword: "unpublish",
        description: "Tarik artikel kembali ke draf (Cth: unpublish clx123...)",
        execute: runActionCommand
    },
    {
        keyword: "draft",
        description: "Sama seperti unpublish (Alias)",
        execute: runActionCommand
    },
    {
        keyword: "mv",
        description: "Pindah file ke folder lain atau root (Cth: mv clx123... --to root)",
        execute: runActionCommand
    },
    // --- PERINTAH BACKUP & EXPORT (TARUH DI DALAM SYSTEM_COMMANDS) ---
    {
        keyword: "export",
        description: "Ekspor artikel ke file Markdown (Cth: export post clx123...)",
        execute: runActionCommand
    },
    {
        keyword: "backup",
        description: "Backup seluruh database PostgreSQL ke JSON (Cth: backup db --all)",
        execute: runActionCommand
    },
    // --- PERINTAH FILE SYSTEM (The Linux Hacker) ---
    {
        keyword: "mkdir",
        description: "Buat folder/kategori baru (Cth: mkdir Eksperimen React)",
        execute: runActionCommand
    },
    {
        keyword: "rmdir",
        description: "Hapus folder. Tambah --force untuk hapus isinya juga (Cth: rmdir Sampah --force)",
        execute: runActionCommand
    },
];

export const getCommandMatch = (input: string) => {
    const keyword = input.trim().split(/\s+/)[0].toLowerCase();
    return SYSTEM_COMMANDS.find(cmd => cmd.keyword === keyword);
};