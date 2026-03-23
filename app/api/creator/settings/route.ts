import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/api/auth/[...nextauth]/route";

// PATCH /api/creator/settings
// body: { creatorStatsPublic: boolean }
// Hanya pemilik akun yang bisa ubah setting ini.

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Harus login." },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { creatorStatsPublic } = body;

        if (typeof creatorStatsPublic !== "boolean") {
            return NextResponse.json(
                { message: "creatorStatsPublic harus boolean." },
                { status: 400 }
            );
        }

        const updated = await prisma.user.update({
            where: { email: session.user.email },
            data: { creatorStatsPublic },
            select: { creatorStatsPublic: true, handle: true },
        });

        return NextResponse.json({
            message: creatorStatsPublic
                ? "Creator page sekarang publik."
                : "Creator page sekarang privat.",
            creatorStatsPublic: updated.creatorStatsPublic,
            handle: updated.handle,
        });

    } catch (error) {
        console.error("[PATCH /api/creator/settings]", error);
        return NextResponse.json(
            { message: "Gagal menyimpan pengaturan." },
            { status: 500 }
        );
    }
}