import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";
import { checkCliToken } from "@/lib/checkCliToken";

const TOKEN_TTL_DAYS = 30;

// GET /api/ntc-refresh
// Caller: utils/config.js — dipanggil otomatis kalau token < 3 hari sisa.
// Tidak perlu re-login, cukup token yang masih valid.
export async function GET(req: Request) {
    // Validasi token lama (harus masih valid, belum expired)
    const { user, error } = await checkCliToken(req);
    if (error) return error;

    const token = `ntc_${randomBytes(32).toString("hex")}`;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + TOKEN_TTL_DAYS);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            cliToken: token,
            cliTokenExpiry: expiry,
        },
    });

    return NextResponse.json({
        token,
        expiresAt: expiry.toISOString(),
    });
}