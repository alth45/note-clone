# 🗂️ Project Structure — NoteOS / note-clone

Dokumen ini memetakan seluruh struktur direktori dan file pada project **note-clone** (NoteOS), sebuah platform note-taking & publishing dengan arsitektur Next.js App Router, Prisma ORM, PostgreSQL (Supabase), dan CLI bawaan untuk manajemen konten.

---

## 1. Root Directory

| File / Folder | Keterangan |
|---------------|------------|
| `.gitignore` | File yang diabaikan Git |
| `README.md` | Dokumentasi utama project (fitur, setup, OAuth, deployment) |
| `PROJECT_STRUCTURE.md` | File ini — peta struktur project |
| `eslint.config.mjs` | Konfigurasi ESLint (flat config) |
| `next.config.ts` | Konfigurasi Next.js |
| `package.json` | Manajemen dependensi & scripts (`dev`, `build`, `start`, `lint`) |
| `package-lock.json` | Lockfile dependensi |
| `postcss.config.mjs` | Konfigurasi PostCSS |
| `prisma.config.ts` | Konfigurasi Prisma (schema & datasource URL) |
| `tailwind.config.ts` | Konfigurasi Tailwind CSS |
| `tsconfig.json` | Konfigurasi TypeScript |
| `prisma/` | Folder skema database Prisma |
| `public/` | Aset statis (SVG, favicon, dll.) |
| `app/` | Aplikasi Next.js (App Router) — inti dari project |

---

## 2. Folder `app/` (Next.js App Router)

Struktur utama aplikasi berbasis **App Router** Next.js 15.

```
app/
├── layout.tsx              # Root layout aplikasi
├── page.tsx                # Halaman utama (landing / home)
├── globals.css             # CSS global (Tailwind)
├── favicon.ico             # Favicon situs
│
├── api/                    # Route Handlers (API Routes)
│   ├── analytics/route.ts
│   ├── auth/[...nextauth]/route.ts
│   ├── bookmarks/route.ts
│   ├── by-slug/[slug]/route.ts
│   ├── cli-login/route.ts
│   ├── cli/route.ts
│   ├── comments/[id]/route.ts
│   ├── comments/route.ts
│   ├── creator/[handle]/route.ts
│   ├── creator/settings/route.ts
│   ├── explorer/[id]/route.ts
│   ├── explorer/route.ts
│   ├── feed/following/route.ts
│   ├── follow/[handle]/route.ts
│   ├── follow/route.ts
│   ├── interact/route.ts
│   ├── notes/route.ts
│   ├── notifications/route.ts
│   ├── ntc-delete/route.ts
│   ├── ntc-list/route.ts
│   ├── ntc-mkdir/route.ts
│   ├── ntc-mv/route.ts
│   ├── ntc-publish/route.ts
│   ├── ntc-pull/route.ts
│   ├── ntc-refresh/route.ts
│   ├── ntc-upload/route.ts
│   ├── posts/[id]/route.ts
│   ├── posts/route.ts
│   ├── profile/route.ts
│   ├── register/route.ts
│   ├── search/route.ts
│   ├── series/[id]/posts/route.ts
│   ├── series/[id]/route.ts
│   ├── series/route.ts
│   ├── tags/route.ts
│   ├── upload/route.ts
│   └── whoami/route.ts
│
├── calendar/
│   └── page.tsx            # Halaman kalender arsip artikel
│
├── components/             # Komponen React reusable
│   ├── ThemeScript.tsx
│   ├── analytics/
│   │   └── ViewsChart.tsx
│   ├── dashboard/
│   │   ├── DashboardHeader.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── DashboardTabs.tsx
│   │   ├── PostList.tsx
│   │   └── PostRow.tsx
│   ├── home/
│   │   ├── CategoryFilter.tsx
│   │   ├── FollowingFeed.tsx
│   │   ├── Hero.tsx
│   │   ├── HomeFeedTabs.tsx
│   │   ├── MobileExploreMenu.tsx
│   │   ├── NotesBar.tsx
│   │   ├── PostRecommendation.tsx
│   │   └── TimelineSidebar.tsx
│   ├── layout/
│   │   └── Navbar.tsx
│   ├── ui/
│   │   ├── AvatarUploader.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── CommentThread.tsx
│   │   ├── FloatingActionBar.tsx
│   │   ├── FollowButton.tsx
│   │   ├── NotificationDropdown.tsx
│   │   ├── PostCard.tsx
│   │   ├── QuickEditorModal.tsx
│   │   ├── ReadingProgress.tsx
│   │   ├── SearchResultItem.tsx
│   │   ├── SeriesNav.tsx
│   │   ├── TerminalResultModal.tsx
│   │   └── ThemeToggle.tsx
│   └── write/              # Komponen khusus halaman menulis (editor)
│       ├── CoverImageUploader.tsx
│       ├── EditorCanvas.tsx
│       ├── EditorToolbar.tsx
│       ├── EditorTopBar.tsx
│       ├── FileExplorerSidebar.tsx
│       ├── RecoveryBanner.tsx
│       ├── TagInput.tsx
│       ├── components/
│       │   └── CoverImageUploader.tsx
│       ├── hooks/
│       │   ├── useCoverImage.ts
│       │   ├── useDraftBackup.ts
│       │   ├── useEditorPost.ts
│       │   └── useNtcDownload.ts
│       └── utils/
│           ├── coverImageStorage.ts
│           ├── draftStorage.ts
│           └── htmlToNtc.ts
│
├── context/                # React Context providers
│   ├── AuthContext.tsx
│   ├── DialogContext.tsx
│   └── NextAuthProvider.tsx
│
├── creator/
│   └── [handle]/
│       └── page.tsx        # Halaman profil kreator
│
├── dashboard/
│   ├── page.tsx            # Halaman dashboard utama
│   ├── analytics/
│   │   └── page.tsx        # Analitik dashboard
│   └── series/
│       └── page.tsx        # Manajemen series dashboard
│
├── explore/
│   └── page.tsx            # Halaman eksplorasi konten
│
├── folder/
│   └── [slug]/
│       └── page.tsx        # Halaman detail folder/kategori
│
├── hooks/                  # Custom React hooks global
│   ├── useComments.ts
│   ├── useDashboard.ts
│   ├── useGlobalSearch.ts
│   ├── useNotifications.ts
│   ├── useTheme.ts
│   └── useUpload.ts
│
├── lib/                    # Utilitas & konfigurasi backend
│   ├── checkCliToken.ts
│   ├── commandEngine.ts    # Engine perintah CLI (Ctrl+K terminal)
│   ├── createNotification.ts
│   ├── db.ts               # Koneksi database
│   ├── prisma.ts           # Prisma Client singleton
│   ├── rateLimit.ts        # Rate limiting
│   ├── SlideExtension.ts   # Ekstensi custom Tiptap (slide embed)
│   └── storage.ts          # Utilitas penyimpanan
│
├── login/
│   └── page.tsx            # Halaman login
│
├── post/
│   └── [slug]/
│       ├── page.tsx        # Halaman baca artikel
│       ├── ReadClient.tsx  # Komponen klien pembaca artikel
│       └── RelatedArticles.tsx # Artikel terkait
│
├── scripts/
│   └── migrate.ts          # Skrip migrasi data
│
├── search/
│   └── page.tsx            # Halaman pencarian
│
├── series/
│   └── [slug]/
│       └── page.tsx        # Halaman detail series
│
├── types/
│   └── next-auth.d.ts      # Ekstensi tipe NextAuth
│
├── u/
│   └── [handle]/
│       └── page.tsx        # Halaman profil pengguna
│
└── write/
    ├── layout.tsx          # Layout halaman menulis
    ├── page.tsx            # Halaman menulis baru
    └── [postId]/
        └── page.tsx        # Halaman edit artikel existing
```

---

## 3. Folder `prisma/`

| File | Keterangan |
|------|------------|
| `schema.prisma` | Skema database lengkap (PostgreSQL) |

### Model Database (Prisma Schema)

| Model | Deskripsi |
|-------|-----------|
| `User` | Pengguna, autentikasi, profil, CLI token, followers/following, notifikasi, audit log |
| `Folder` | Direktori kategori milik user (self-relation untuk sub-folder) |
| `Post` | Artikel / catatan (judul, slug, konten JSON, views, likes, bookmarks) |
| `Like` | Like pada artikel |
| `Bookmark` | Bookmark artikel |
| `Comment` | Komentar pada artikel |
| `Follow` | Relasi follow antar pengguna |
| `Notification` | Notifikasi sistem |
| `AuditLog` | Log aktivitas pengguna (publish, delete, update, dll.) |
| `SecurityEvent` | Event keamanan (login gagal, rate limit, token expired, dll.) |
| `DeleteLog` | Log penghapusan folder & artikel |
| `Series` | Kumpulan artikel dalam sebuah series |
| `SeriesPost` | Tabel pivot (junction) series ↔ post |
| `Note` | Note ringkas (maksimal 280 karakter, bgColor, emoji, expired) |
| `Account` | Data OAuth (Google/GitHub) — NextAuth |
| `Session` | Sesi autentikasi — NextAuth |

---

## 4. Folder `public/`

| File | Keterangan |
|------|------------|
| `file.svg` | Ikon file generik |
| `globe.svg` | Ikon globe |
| `next.svg` | Logo Next.js |
| `vercel.svg` | Logo Vercel |
| `window.svg` | Ikon window |

---

## 5. Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Bahasa | TypeScript |
| Database | PostgreSQL (via Supabase) |
| ORM | Prisma v7 |
| Auth | NextAuth.js (v4) + Prisma Adapter |
| Styling | Tailwind CSS v4 |
| Editor Rich Text | Tiptap (custom extensions: slide, table, code, image, link, dll.) |
| Icons | Lucide React |
| Syntax Highlighting | react-syntax-highlighter |
| Markdown Parser | marked |
| HTML Parser | html-react-parser |
| Deploy | Vercel |

---

## 6. Scripts Utama (`package.json`)

| Script | Perintah | Keterangan |
|--------|----------|------------|
| `dev` | `next dev` | Jalankan server development |
| `build` | `next build` | Build untuk production |
| `start` | `next start` | Jalankan server production |
| `lint` | `eslint` | Jalankan ESLint |
| `postinstall` | `prisma generate` | Generate Prisma Client otomatis setelah install |

---

## 7. Fitur Unggulan (dari README)

1. **NoteOS Command Center (CLI)** — Terminal dalam browser (`Ctrl+K`) dengan perintah ala Linux: `mkdir`, `dir`/`ls`, `rmdir`, `mv`, `show post`, `grep`, `publish`, `draft`, `export post`, `backup db`, `ping`, `whoami`, `sweep drafts`, `clear cache`, `help`.
2. **Editor Supercharged (Tiptap)** — Format markdown, slide embeds (Google Slides / Speaker Deck), auto-save.
3. **Dynamic Reading Experience** — 4 mode visual: Default, Journal, PDF, Zen.
4. **Optimistic UI** — Floating Action Bar (`Ctrl+J`), like & bookmark optimistik, smart share.
5. **Intelligent Widgets** — Calendar timeline, Editor's Pick (views > 20).

---

## 8. Catatan Penting

- Project menggunakan **Next.js 15** dengan **App Router** (semua route ada di dalam folder `app/`).
- API route menggunakan **Route Handlers** (`route.ts`) bukan `pages/api`.
- Autentikasi menggunakan **NextAuth v4** dengan **Prisma Adapter** dan PostgreSQL.
- Editor menggunakan **Tiptap v3** dengan ekstensi custom (termasuk `SlideExtension` untuk presentasi).
- CLI bawaan diintegrasi melalui `commandEngine.ts` dan berbagai route API berawalan `ntc-*` (note-clone).
- Variabel environment yang diperlukan (lihat `README.md`): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`.

---

*Dokumen ini dibuat sebagai peta referensi struktur project note-clone. Sesuaikan lagi jika ada penambahan atau refaktorisasi struktur direktori.*
