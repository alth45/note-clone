import FileExplorerSidebar from "@/components/write/FileExplorerSidebar";

export default function WriteLayout({ children }: { children: React.ReactNode }) {
    return (
        // Bikin full screen mentok di bawah navbar
        <div className="flex -mt-8 md:-mt-12 -mx-4 sm:-mx-6 lg:-mx-12 overflow-hidden border-t border-sumi-10 h-[calc(100vh-64px)]">
            {/* Sidebar Kiri - Permanen */}
            <FileExplorerSidebar />

            {/* Area Kanan - Dinamis (Bisa Blank, bisa Editor) */}
            <div className="flex-1 relative overflow-y-auto bg-washi">
                {children}
            </div>
        </div>
    );
}