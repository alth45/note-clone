import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// Token berlaku 30 hari
const TOKEN_TTL_DAYS = 30;

function generateCliToken(): string {
    return `ntc_${randomBytes(32).toString("hex")}`;
}

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: "Email dan password wajib diisi." },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                handle: true,
                password: true,
            },
        });

        if (!user?.password) {
            return NextResponse.json(
                { message: "Email atau password salah." },
                { status: 401 }
            );
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return NextResponse.json(
                { message: "Email atau password salah." },
                { status: 401 }
            );
        }

        // Generate token baru + expiry
        const token = generateCliToken();
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
            username: user.handle ?? user.name ?? email.split("@")[0],
        });

    } catch (error) {
        console.error("[POST /api/cli-login]", error);
        return NextResponse.json(
            { message: "Server error." },
            { status: 500 }
        );
    }
}