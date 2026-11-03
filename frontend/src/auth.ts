import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const isPostgresConfigured = Boolean(
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith("postgresql://") || process.env.DATABASE_URL.startsWith("postgres://"))
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  ...(isPostgresConfigured ? { adapter: PrismaAdapter(prisma) } : {}),
});
