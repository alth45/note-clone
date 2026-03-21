import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const NOTIF_SELECT = {
    id: true,
    type: true,
    isRead: true,
    createdAt: true,
    actor: {
        select: {
            id: true,
            name: true,
            handle: true,
            image: true,
        },
    },
    post: {
        select: {
            id: true,
            title: true,
            slug: true,
        },
    },
    comment: {
        select: {
            id: true,
            content: true,
        },
    },
} as const;

// GET /api/notifications?limit=20&cursor=<id>
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get("cursor") ?? undefined;
        const LIMIT = 20;

        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { recipientId: user.id },
                select: NOTIF_SELECT,
                orderBy: { createdAt: "desc" },
                take: LIMIT + 1,
                ...(cursor && { skip: 1, cursor: { id: cursor } }),
            }),
            prisma.notification.count({
                where: { recipientId: user.id, isRead: false },
            }),
        ]);

        const hasMore = notifications.length > LIMIT;
        const items = hasMore ? notifications.slice(0, LIMIT) : notifications;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        return NextResponse.json(
            { notifications: items, unreadCount, hasMore, nextCursor },
            { status: 200 }
        );

    } catch (error) {
        console.error("[GET /api/notifications]", error);
        return NextResponse.json({ message: "Gagal mengambil notifikasi." }, { status: 500 });
    }
}

// PATCH /api/notifications
// body: { ids?: string[] } — kalau kosong, mark ALL sebagai read
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        const body = await req.json().catch(() => ({}));
        const ids: string[] | undefined = body.ids;

        await prisma.notification.updateMany({
            where: {
                recipientId: user.id,
                isRead: false,
                ...(ids?.length && { id: { in: ids } }),
            },
            data: { isRead: true },
        });

        return NextResponse.json({ message: "Ditandai sudah dibaca." }, { status: 200 });

    } catch (error) {
        console.error("[PATCH /api/notifications]", error);
        return NextResponse.json({ message: "Gagal update notifikasi." }, { status: 500 });
    }
}