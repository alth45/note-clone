// scripts/migrate-passwords.ts
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";


const users = await prisma.user.findMany({
    where: { password: { not: null } },
    select: { id: true, password: true }
})
for (const user of users) {
    const isBcrypt = user.password?.startsWith("$2b$") || user.password?.startsWith("$2a$")
    if (!isBcrypt && user.password) {
        const hashed = await bcrypt.hash(user.password, 12)
        await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
    }
}