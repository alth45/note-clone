import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({ where: { email: credentials.email } });
                if (!user || !user.password) throw new Error("Email tidak terdaftar.");

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                if (!isPasswordValid) throw new Error("Kata sandi salah.");

                // TAMBAHIN HANDLE DAN BIO DI SINI
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    handle: user.handle, // <--- Data dari DB
                    bio: user.bio,       // <--- Data dari DB
                };
            }
        })
    ],
    // --- INI KUNCINYA: CALLBACKS ---
    callbacks: {
        // 1. Masukin data ke Token JWT
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.handle = (user as any).handle;
                token.bio = (user as any).bio;
            }
            // Kalau kita nembak update() dari Frontend, perbarui tokennya
            if (trigger === "update" && session) {
                token.name = session.name;
                token.handle = session.handle;
                token.bio = session.bio;
            }
            return token;
        },
        // 2. Kirim dari Token ke Session Frontend
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).id = token.id;
                (session.user as any).handle = token.handle;
                (session.user as any).bio = token.bio;
            }
            return session;
        }
    }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };