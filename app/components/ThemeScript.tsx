// components/ThemeScript.tsx
// Script kecil yang di-inject di <head> SEBELUM halaman render.
// Ini mencegah flash of unstyled content (FOUC) saat refresh di dark mode.
//
// Cara pakai di app/layout.tsx:
//   import ThemeScript from "@/components/ThemeScript";
//   ...
//   <head>
//     <ThemeScript />
//   </head>

export default function ThemeScript() {
    // dangerouslySetInnerHTML diperlukan agar script dieksekusi segera,
    // bukan setelah React hydration.
    const script = `
(function(){
    try {
        var stored = localStorage.getItem('noteos-theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var isDark = stored === 'dark' || (!stored && prefersDark);
        if (isDark) document.documentElement.classList.add('dark');
    } catch(e) {}
})();
    `.trim();

    return (
        <script
            dangerouslySetInnerHTML={{ __html: script }}
        />
    );
}