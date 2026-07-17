import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProfileForm } from "./profile-form";

export default async function PerfilPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Perfil" subtitle="Seus dados e preferências de recebimento." />
      <Card accent className="max-w-2xl">
        <ProfileForm
          initial={{
            name: user.name,
            email: user.email,
            username: user.username ?? "",
            cpf: user.cpf ?? "",
            accountType: user.accountType,
            pixKey: user.pixKey ?? "",
            avatar: user.avatar ?? "",
          }}
        />
      </Card>
    </>
  );
}
