import { FileCode2 } from "lucide-react";

export default function WriteBlankState() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center text-sumi-muted/50 select-none">
            <FileCode2 size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Pilih file di eksplorer untuk mulai menulis</p>
            <p className="text-sm mt-2 opacity-70">Atau klik ikon + untuk membuat file baru</p>
        </div>
    );
}