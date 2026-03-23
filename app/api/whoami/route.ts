import { NextResponse } from "next/server";
import { checkCliToken } from "@/lib/checkCliToken";

// GET /api/whoami
// Dipanggil oleh ntc CLI untuk verifikasi token dan ambil info user.
// Hanya return data yang aman — tidak expose userId atau internal data.

export async function GET(req: Request) {
    try {
        const { user, error } = await checkCliToken(req);
        if (error) return error;

        return NextResponse.json({
            username: user.handle ?? user.name ?? user.email?.split("@")[0] ?? "unknown",
            handle: user.handle ?? null,
            email: user.email ?? null,
        });

    } catch (error) {
        console.error("[GET /api/whoami]", error);
        return NextResponse.json(
            { message: "Server error." },
            { status: 500 }
        );
    }
}