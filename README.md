# 🚀 NoteOS: The Ultimate Hacker's Knowledge Base

> *"Talk is cheap. Show me the code."* — Linus Torvalds
>
> *"Talk is cheap. Show me why your Vercel deploy keeps failing."* — Developer yang trauma

NoteOS adalah platform *note-taking* dan *publishing* eksklusif yang dibangun dengan arsitektur modern. Bukan sekadar web blog biasa, platform ini dilengkapi dengan **Command Line Interface (CLI)** bawaan ala sistem operasi Linux/DevOps untuk manajemen data secara brutal, cepat, dan presisi.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma v7 |
| Auth | NextAuth.js |
| Styling | Tailwind CSS + Arbitrary Variants |
| Editor | Tiptap (Custom Extensions) |
| Icons | Lucide React |
| Deploy | Vercel |

---

## 🔥 Fitur Utama

### 1. 💻 NoteOS Command Center (CLI)
Bypass UI konvensional! Tekan `Ctrl + K` untuk membuka Terminal dan ketikkan perintah layaknya seorang *System Administrator*:

**Manajemen File & Folder (The Linux Hacker):**
- `mkdir <nama>` — Membuat direktori/kategori baru
- `dir` / `ls` — Menampilkan daftar direktori beserta jumlah file
- `rmdir <nama> [--force]` — Menghapus folder. `--force` = mode brutal (hapus beserta isinya)
- `mv <id> --to <folder_id / root>` — Memindahkan lokasi artikel

**Pencarian & Analitik (Data Scientist):**
- `show post [-n] [-e content] [-rg prev X]` — Filter database artikel dengan presisi tinggi
- `grep <kata_kunci>` — *Deep scan* ke seluruh isi konten artikel
- `stats` / `neofetch` — Analitik menulis dengan UI ASCII Art klasik

**Manipulasi Status & Backup (DevOps):**
- `publish <id>` — Mengudara instan (Draf → Publik)
- `draft <id>` / `unpublish <id>` — Tarik artikel kembali ke Draf
- `export post <id>` — Download artikel ke format Markdown (`.md`)
- `backup db --all` — Ekstrak seluruh database ke `backup.json`

**Maintenance & Diagnostik (The Cleaner):**
- `ping` — Cek *latency* ke PostgreSQL secara *real-time*
- `whoami` — Tampilkan sesi JSON pengguna yang sedang login
- `sweep drafts` — Lenyapkan seluruh draf kosong dari database
- `clear cache` — Bersihkan memori browser & *reload* sistem
- `help` — Manual bantuan sistem

### 2. 📝 Editor Supercharged (Tiptap)
- Format Markdown lengkap
- **Slide Embeds** — Custom Node untuk `iframe` presentasi (Google Slides, Speaker Deck) dengan rasio 16:9 anti-gepeng
- Auto-Save Ready

### 3. 📖 Dynamic Reading Experience
4 mode visual yang menyesuaikan *mood* pembaca:
1. **Default** — Fokus teks, proporsi standar
2. **Journal** — Serif klasik, *background* kertas Washi
3. **PDF** — Dua kolom profesional
4. **Zen** — Mode gelap absolut untuk fokus malam hari

### 4. ⚡ Optimistic UI & Interaksi
- **Floating Action Bar** — `Ctrl + J` untuk menu interaksi
- **Like & Bookmark** — Optimistic Updates, UI berubah instan tanpa nunggu server
- **Smart Share** — Salin tautan dengan *custom alert popup*

### 5. 📊 Intelligent Widgets
- **Calendar Timeline** — Navigasi arsip artikel via kalender visual
- **Editor's Pick** — Muncul hanya jika ada artikel trending (views > 20)

---

## 🗄️ Database Schema

```
User ──┬── Post ──┬── Like
       │          └── Bookmark
       └── Folder ──── Post
```

| Model | Deskripsi |
|-------|-----------|
| `User` | Data autentikasi & profil |
| `Post` | Artikel, status, views, likesCount, konten JSON |
| `Folder` | Direktori kategori milik User |
| `Like` | Junction table unik per User-Post |
| `Bookmark` | Junction table unik per User-Post |

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd note-clone
npm install
```

### 2. Setup Environment Variables

Buat file `.env`:

```env
# Pooler URL (Transaction mode, port 6543) → untuk runtime
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

NEXTAUTH_SECRET="rahasia_super_kuat"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Setup Prisma Config

Buat `prisma.config.ts` di root:

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

### 4. Push Schema ke Database

```bash
npx prisma db push
```

### 5. Jalankan Dev Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) 🎉

---

## ☁️ Deploy ke Vercel

Set environment variables di **Vercel → Settings → Environment Variables**:

```
DATABASE_URL = postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
NEXTAUTH_SECRET = ...
NEXTAUTH_URL = https://your-domain.vercel.app
```

Pastikan **Supabase → Settings → Network Restrictions** di-**disable** agar Vercel bisa konek (IP Vercel bersifat dynamic).

---

## 🩸 The Deployment War Story
### *Atau: Bagaimana Kami Hampir Gila Sebelum Berhasil Deploy*

> Bagian ini didedikasikan untuk semua developer yang pernah menatap layar error pukul 12 malam dan bertanya, *"Kenapa hidup ini."*

---

Semua bermula dari sebuah ambisi sederhana: **deploy ke Vercel**. Seharusnya 10 menit. Kenyataannya? Sebuah odyssey panjang yang melewati 7 lingkaran neraka deployment.

---

### ⚔️ Babak 1: The Prerender Massacre

```
Error occurred prerendering page "/"
PrismaClientKnownRequestError: connect ENETUNREACH
```

Next.js dengan polosnya mencoba **prerender halaman "/" saat build time** — memanggil database Prisma ke server yang... tidak tersedia saat build. Solusinya? Tambah `export const dynamic = 'force-dynamic'` di page. Masalah pertama selesai. *Kita belum tahu ini hanya pemanasan.*

---

### ⚔️ Babak 2: Prisma v7 Mengkhianati Semua yang Kita Tahu

Setelah deploy berhasil, muncul:

```
Application error: a server-side exception has occurred
```

Lalu kita sadar: **Prisma v7 sudah tidak sama seperti dulu.** Konfigurasi `directUrl` di `schema.prisma`? Tidak berlaku lagi. Semua harus pindah ke `prisma.config.ts`. File baru yang tidak ada di tutorial manapun yang kita baca.

Percobaan pertama `prisma.config.ts`:
```ts
datasources: {
  db: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL, // ← ini yang bikin nangis
  }
}
```

TypeScript langsung menyerang:
```
'directUrl' does not exist in type
```

*Oke. Fine. Deep breath.*

---

### ⚔️ Babak 3: The URL Format Hell

Setelah berjam-jam riset, format URL akhirnya benar. Tapi kemudian:

```
P1013: The provided database string is invalid.
The scheme is not recognized.
```

Ternyata? **Password mengandung karakter spesial** yang tidak di-encode. Satu karakter `@` atau `#` di password bisa membuat seluruh connection string invalid tanpa pesan error yang jelas.

Password direset. URL diperbarui. Lanjut.

---

### ⚔️ Babak 4: IPv4 vs IPv6 — Perang yang Tidak Kita Minta

```
P1001: Can't reach database server at db.xxx.supabase.co:5432
```

Supabase direct connection (`db.xxx.supabase.co:5432`) ternyata **hanya support IPv6**. Sementara jaringan lokal pakai IPv4. Dua protokol yang hidup di dunia berbeda, tidak saling menyapa.

Solusi: ganti ke **Session Pooler** (`aws-0-region.pooler.supabase.com:5432`) yang IPv4-compatible. *Tapi perjalanan belum selesai.*

---

### ⚔️ Babak 5: Tenant Not Found — Identitas Dipertanyakan

```
FATAL: Tenant or user not found
```

Username di connection string salah format. Untuk Supabase pooler, username bukan `postgres` biasa, tapi harus `postgres.[project-ref]`. Satu detail kecil yang tidak ada di dokumentasi utama.

Difix. Lanjut.

---

### ⚔️ Babak 6: SSL Certificate Menyerang dari Belakang

```
Error: self-signed certificate in certificate chain
```

SSL. Tentu saja SSL. Tidak cukup hanya `sslmode=require`. Butuh `rejectUnauthorized: false` di konfigurasi pg client. *Karena kenapa tidak.*

---

### ⚔️ Babak 7: Network Restrictions — Bos Terakhir

Setelah semua fix diterapkan, `npx prisma db push` akhirnya berhasil. Deploy ke Vercel. Buka URL. Dan...

```
DriverAdapterError: Address not in tenant allow_list: {100, 31, 190, 31}
```

IP Vercel diblokir oleh Supabase Network Restrictions. IP Vercel bersifat **dynamic** — berubah setiap request. Solusi whitelist satu per satu? Tidak mungkin. Solusi `0.0.0.0/0`? Masih kena restrict karena fiturnya harus **di-disable total**, bukan hanya di-allow-all.

Masuk ke **Supabase → Network Restrictions → Disable**.

Refresh halaman.

**✅ IT WORKS.**

---

### 📜 Lessons from the Battlefield

| Error | Penyebab | Fix |
|-------|----------|-----|
| `ENETUNREACH` saat build | Next.js prerender hit DB | `export const dynamic = 'force-dynamic'` |
| `directUrl does not exist` | Prisma v7 breaking change | Hapus dari `prisma.config.ts`, taruh di `schema.prisma` (tapi ini juga salah di v7) |
| `P1013 scheme not recognized` | Karakter spesial di password | Reset password, pakai alphanumeric only |
| `P1001 Can't reach` | Supabase direct URL IPv6 only | Pakai Session Pooler port 5432 |
| `Tenant or user not found` | Format username salah | Pakai `postgres.[project-ref]` |
| `self-signed certificate` | SSL strict mode | `rejectUnauthorized: false` |
| `Address not in allow_list` | Supabase Network Restrictions | Disable Network Restrictions di Supabase |

---

### 🏆 Konfigurasi Final yang Benar-Benar Jalan

**`.env`**
```env
# Transaction Pooler → runtime (Vercel)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**`prisma.config.ts`**
```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

**Supabase Settings:**
- ✅ Network Restrictions: **DISABLED**
- ✅ Connection: **Transaction Pooler (port 6543)**

---

*Total waktu yang dihabiskan: tidak perlu disebutkan. Yang penting: **berhasil.***

*Dipersembahkan oleh seseorang yang sekarang sangat paham perbedaan antara Session Pooler dan Transaction Pooler di Supabase.* 🩸


# COMING SOON



# Setup OAuth (Google & GitHub) di NextAuth

> **Catatan:** Gratis semua, tidak perlu bayar.

## 🌐 Google OAuth

1. Buka [console.cloud.google.com](https://console.cloud.google.com).
2. Buat project baru (atau pakai project yang sudah ada).
3. Di sidebar, navigasi ke **APIs & Services** → **Credentials**.
4. Klik **Create Credentials** → **OAuth Client ID**.
5. Pilih Application type → **Web application**.
6. Di bagian **Authorized redirect URIs** tambahkan:
   - `http://localhost:3000/api/auth/callback/google` *(untuk development)*
   - `https://domain-lo.com/api/auth/callback/google` *(untuk production)*
7. Klik **Create** → lo akan dapat `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`.
   
*Note: Kalau baru pertama kali, biasanya lo bakal diminta setup **OAuth consent screen** dulu. Tinggal isi nama app, email, dan logo (opsional). Pilih tipe **External** kalau mau semua orang (publik) bisa login.*

---

## 🐙 GitHub OAuth

1. Buka [github.com/settings/developers](https://github.com/settings/developers).
2. Masuk ke menu **OAuth Apps** → Klik **New OAuth App**.
3. Isi form pendaftaran aplikasi:
   - **Application name:** *[nama app lo]*
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
4. Klik **Register** → lo akan dapat `GITHUB_ID`.
5. Klik **Generate a new client secret** → lo akan dapat `GITHUB_SECRET`.

---

## ⚙️ Konfigurasi Kode

### 1. Setup Environment Variables
Taruh kredensial yang udah lo dapetin ke dalam file `.env.local` di root folder project lo:

```env
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_ID=xxx
GITHUB_SECRET=xxx
```

### 2. Update NextAuth Config
Tambahkan *provider* Google dan GitHub ke dalam `authOptions` di file `app/api/auth/[...nextauth]/route.ts`:

```typescript
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

// ... konfigurasi NextAuth lainnya

providers: [
    GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GithubProvider({
        clientId: process.env.GITHUB_ID!,
        clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({ ... }), // provider yang sudah ada sebelumnya
]
```

---

## 🚀 Catatan Deployment

Saat mau deploy aplikasi lo ke production:
1. Ganti semua URL `localhost:3000` di setup Google Cloud Console & GitHub Developer Settings dengan **domain asli lo**.
2. Jangan lupa tambahkan *environment variables* (ID dan Secret) yang sama di dashboard platform hosting lo (misal: Settings di dashboard Vercel).
```
