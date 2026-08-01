import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { checkRateLimit } from "./rate-limit";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email e senha obrigatórios");
      }

      const email = credentials.email.toLowerCase().trim();
      // 10 tentativas / 15 min por email — mitiga força bruta sem travar quem erra a senha 1-2x.
      const allowed = await checkRateLimit(`login:${email}`, 10, 15 * 60 * 1000);
      if (!allowed) {
        throw new Error("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        throw new Error("Email ou senha incorretos");
      }

      const passwordMatch = await bcrypt.compare(
        credentials.password,
        user.passwordHash
      );

      if (!passwordMatch) {
        throw new Error("Email ou senha incorretos");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatar ?? undefined,
        username: user.username ?? undefined,
      };
    },
  }),
];

// OAuth providers só entram se as credenciais existirem (placeholders => omitidos),
// evitando erro de "clientId is required" em dev sem chaves.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers,
  session: {
    // CredentialsProvider exige JWT (database-sessions não funciona com credentials).
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // No primeiro login, copia id/username do usuário pro token.
      if (user) {
        token.id = user.id;
        token.username = user.username ?? null;
      }
      // Mantém username fresco a partir do banco quando disponível.
      if (token.id && token.username === undefined) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { username: true },
        });
        token.username = dbUser?.username ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.username = (token.username as string | null) ?? null;
      }
      return session;
    },
  },
};
