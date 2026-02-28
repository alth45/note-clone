// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";

// Kita "nge-hack" tipe bawaan NextAuth biar ngenalin properti baru kita
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            handle?: string | null;
            bio?: string | null;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        handle?: string | null;
        bio?: string | null;
    }
}