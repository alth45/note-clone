// components/ThemeScript.tsx
// Inject di <head> sebelum apapun — cegah flash saat refresh di dark mode.
// Tidak butuh React, jalan sebagai raw script.

export default function ThemeScript() {
    return (
        <script
            dangerouslySetInnerHTML={{
                __html: `(function(){try{var t=localStorage.getItem('noteos-theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
            }}
        />
    );
}