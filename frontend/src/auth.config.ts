import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authConfig = {
  providers: [
    ...(googleConfigured
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        })]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        // Controlled demo authentication gated strictly to development or explicit DEMO flag
        const isDev = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_LOGIN === "true";
        const demoAdminPass = process.env.DEMO_ADMIN_PASSWORD || "admin123";

        if (isDev && email === "admin@agentix.com" && (password === "admin123" || password === "admin" || password === demoAdminPass)) {
          try {
            const user = await prisma.user.upsert({
              where: { email: "admin@agentix.com" },
              update: {},
              create: {
                id: "default-admin-1",
                name: "Enterprise Admin",
                email: "admin@agentix.com",
                role: "ADMIN",
              },
            });
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              image: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
            };
          } catch {
            // Air-gapped local development mode fallback when Postgres is unprovisioned
            return {
              id: "default-admin-1",
              name: "Enterprise Admin",
              email: "admin@agentix.com",
              role: "ADMIN",
              image: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
            };
          }
        }

        // Standard user authentication from database
        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              image: user.image || undefined,
            };
          }
        } catch (e) {
          console.warn("[Auth] Database unavailable for credentials lookup:", e);
        }
        return null;
      }
    })
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: { 
    signIn: "/login",
  },
  // No hardcoded fallback: a known secret string committed in source would
  // let anyone forge a valid session JWT against any deployment that forgot
  // to override it. AUTH_SECRET must be set (frontend/.env for local dev -
  // gitignored, generated randomly; a real one in production).
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-expect-error role is set by the credentials authorize() callback above
        token.role = user.role || "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // @ts-expect-error Type role is not on NextAuth User
        session.user.role = token.role as string;
      }
      return session;
    }
  }
} satisfies NextAuthConfig;
