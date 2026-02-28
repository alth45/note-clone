// "use client";

// import { useParams } from "next/navigation";
// import FileExplorerSidebar from "@/components/write/FileExplorerSidebar";
// import EditorCanvas from "@/components/write/EditorCanvas";

// export default function WritePage() {
//     // Tangkap ID artikel dari URL (contoh: /write/clx92jks0001)
//     const params = useParams();
//     const postId = params.postId as string;

//     return (
//         // Pake -mt-8 dan -mx-6 biar ngilangin padding/margin bawaan layout utama 
//         // biar aplikasinya bener-bener mentok (full-screen look) di bawah navbar
//         <div className="flex -mt-8 md:-mt-12 -mx-4 sm:-mx-6 lg:-mx-12 overflow-hidden border-t border-sumi-10 h-[calc(100vh-64px)]">

//             {/* Kolom Kiri: Sidebar File Explorer */
//             {/* <FileExplorerSidebar /> */

//             {/* Kolom Kanan: Kanvas Editor (Kita lempar postId ke dalemnya!) */
//             {/* Supaya EditorCanvas tau dia lagi ngedit file yang mana */
//             <div className="flex-1 relative overflow-y-auto scrollbar-hide">
//                 <EditorCanvas postId={postId} />
//             </div>

//         </div>
//     );
// }

"use client";

import { useParams } from "next/navigation";
import EditorCanvas from "@/components/write/EditorCanvas";

export default function WriteEditorPage() {
    // Tangkap ID artikel dari URL (contoh: /write/clx92jks0001)
    const params = useParams();
    const postId = params.postId as string;

    // Nggak perlu lagi div flex aneh-aneh, karena udah diurus sama layout.tsx!
    // Kita tinggal panggil kanvasnya aja.
    return <EditorCanvas postId={postId} />;
}