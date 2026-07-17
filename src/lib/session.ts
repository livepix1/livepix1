import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Retorna a sessão ou redireciona para /login. Use em server components do painel. */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

/** Retorna o usuário completo do banco (ou redireciona se não logado). */
export async function requireUser() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    redirect("/login");
  }
  return user;
}
