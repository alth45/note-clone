# 🚀 NoteOS: The Ultimate Hacker's Knowledge Base

NoteOS adalah platform *note-taking* dan *publishing* eksklusif yang dibangun dengan arsitektur modern. Bukan sekadar web blog biasa, platform ini dilengkapi dengan **Command Line Interface (CLI)** bawaan ala sistem operasi Linux/DevOps untuk manajemen data secara brutal, cepat, dan presisi.

## 🛠️ Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth.js
- **Styling:** Tailwind CSS + Arbitrary Variants
- **Rich Text Editor:** Tiptap (Custom Extensions)
- **Icons:** Lucide React

---

## 🔥 Fitur Utama

### 1. 💻 NoteOS Command Center (CLI)
Bypass UI konvensional! Tekan `Ctrl + K` untuk membuka Terminal dan ketikkan perintah layaknya seorang *System Administrator*:

**Manajemen File & Folder (The Linux Hacker):**
- `mkdir <nama>` : Membuat direktori/kategori baru.
- `dir` / `ls` : Menampilkan daftar direktori beserta jumlah file di dalamnya.
- `rmdir <nama> [--force]` : Menghapus folder. Gunakan `--force` untuk mode brutal (menghapus folder beserta seluruh isinya).
- `mv <id> --to <folder_id / root>` : Memindahkan lokasi artikel.

**Pencarian & Analitik (Data Scientist):**
- `show post [-n] [-e content] [-rg prev X]` : Filter database artikel dengan presisi tinggi.
- `grep <kata_kunci>` : *Deep scan* ke seluruh isi konten artikel untuk mencari kalimat spesifik.
- `stats` / `neofetch` : Menampilkan analitik menulis (total kata, hari teraktif) menggunakan UI ASCII Art klasik.

**Manipulasi Status & Backup (DevOps):**
- `publish <id>` : Mengudara secara instan (mengubah Draf menjadi Publik).
- `draft <id>` / `unpublish <id>` : Menarik artikel dari publik kembali ke Draf.
- `export post <id>` : Mengunduh artikel tunggal ke format Markdown (`.md`).
- `backup db --all` : Mengekstrak seluruh database (Post & Folder) menjadi file `backup.json`.

**Maintenance & Diagnostik (The Cleaner):**
- `ping` : Mengecek *latency* ke PostgreSQL secara *real-time* (ms).
- `whoami` : Menampilkan sesi JSON rahasia pengguna yang sedang login.
- `sweep drafts` : Lenyapkan seluruh draf kosong/sampah dari database secara massal.
- `clear cache` : Membersihkan memori browser lokal dan *reload* sistem.
- `help` : Menampilkan manual bantuan sistem.

### 2. 📝 Editor Supercharged (Tiptap)
- **Format Kaya:** Mendukung penulisan Markdown standar.
- **Slide Embeds:** Custom Node yang memungkinkan penyisipan `iframe` presentasi (Google Slides, Speaker Deck) secara langsung di tengah tulisan, dengan jaminan rasio 16:9 anti-gepeng.
- **Auto-Save Ready:** Siap diintegrasikan dengan penyimpanan otomatis (*drafting*).

### 3. 📖 Dynamic Reading Experience
Halaman baca dilengkapi 4 mode visual yang menyesuaikan *mood* pembaca:
1. **Default:** Fokus pada teks dengan proporsi standar.
2. **Journal:** Gaya klasik serif dengan *background* kertas (*Washi*).
3. **PDF:** Tampilan dua kolom profesional.
4. **Zen:** Mode gelap absolut untuk fokus maksimal di malam hari.

### 4. ⚡ Optimistic UI & Interaksi
- **Floating Action Bar:** Tekan `Ctrl + J` (atau klik ikon kapsul) untuk memunculkan menu interaksi.
- **Sistem Like & Bookmark:** Terhubung langsung ke PostgreSQL dengan *Optimistic Updates* (UI berubah instan tanpa menunggu *loading* server).
- **Smart Share:** Salin tautan dengan *custom alert popup*.

### 5. 📊 Intelligent Widgets
- **Calendar Timeline:** Navigasi arsip artikel menggunakan kalender visual yang otomatis memetakan tanggal dengan data PostgreSQL.
- **Editor's Pick:** Widget cerdas yang hanya muncul jika terdapat artikel yang sedang *trending* (views > 20).

---

## 🗄️ Database Schema (Prisma)
Proyek ini menggunakan 5 relasi tabel utama:
1. **`User`**: Data autentikasi dan profil pengguna.
2. **`Post`**: Menyimpan artikel, mengelola status (`published`), total tampilan (`views`, `likesCount`), dan konten dalam bentuk JSON.
3. **`Folder`**: Kategori direktori yang dimiliki oleh *User* dan menampung *Post*.
4. **`Like`**: Tabel *junction* (unik per User-Post) untuk sistem suka.
5. **`Bookmark`**: Tabel *junction* (unik per User-Post) untuk fitur simpan artikel.

---

## 🚀 Cara Menjalankan (*Getting Started*)

1. **Clone & Install Dependencies**
   ```bash
   npm install
   ```
# Setup Environment Variables

Buat file `.env` dan masukkan URI database PostgreSQL serta konfigurasi NextAuth:

## Cuplikan Kode

```env
DATABASE_URL="postgresql://user:password@localhost:5432/noteos"
NEXTAUTH_SECRET="rahasia_super_kuat"
```

---

# Sinkronisasi Database

Push schema Prisma ke PostgreSQL:

```bash
npx prisma db push
```

---

# Jalankan Server Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) dan nikmati OS buatanmu sendiri!

> "Talk is cheap. Show me the code." — Linus Torvalds
