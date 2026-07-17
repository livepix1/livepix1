import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? "Usuário",
        email: session.user.email ?? "",
        avatar: session.user.image,
      }}
    >
      {children}
    </DashboardShell>
  );
}
