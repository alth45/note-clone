// src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

const prismaClientSingleton = () => {
    // Bikin pool koneksi pakai pg
    const pool = new Pool({ connectionString });
    // Pasang adapter PrismaPg
    const adapter = new PrismaPg(pool);

    // Masukkan adapter ke dalam PrismaClient
    return new PrismaClient({ adapter });
};

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;