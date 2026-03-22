// lib/checkCliToken.ts
// Dipakai di semua /api/ntc-* route handlers sebagai guard.
//
// Cara pakai:
//   const { user, error } = await checkCliToken(req);
//   if (error) return error;  // langsung return NextResponse
//   // lanjut pakai user.id, user.email, dll

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface ValidUser {
    id: string;
    email: string | null;
    name: string | null;
    handle: string | null;
}

type CheckResult =
    | { user: ValidUser; error: null }
    | { user: null; error: NextResponse };

export async function checkCliToken(req: Request): Promise<CheckResult> {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;

    if (!token) {
        return {
            user: null,
            error: NextResponse.json(
                { message: "Token tidak ditemukan. Jalankan: ntc login" },
                { status: 401 }
            ),
        };
    }

    const user = await prisma.user.findFirst({
        where: { cliToken: token },
        select: {
            id: true,
            email: true,
            name: true,
            handle: true,
            cliTokenExpiry: true,
        },
    });

    // Token tidak dikenal
    if (!user) {
        return {
            user: null,
            error: NextResponse.json(
                { message: "Token tidak valid. Jalankan: ntc login" },
                { status: 401 }
            ),
        };
    }

    // Token kedaluwarsa
    if (user.cliTokenExpiry && user.cliTokenExpiry < new Date()) {
        return {
            user: null,
            error: NextResponse.json(
                {
                    message: "Token sudah kedaluwarsa. Jalankan: ntc login",
                    expired: true,
                    expiredAt: user.cliTokenExpiry.toISOString(),
                },
                { status: 401 }
            ),
        };
    }

    return {
        user: { id: user.id, email: user.email, name: user.name, handle: user.handle },
        error: null,
    };
}