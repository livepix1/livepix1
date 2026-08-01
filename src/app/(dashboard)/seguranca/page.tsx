import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TotpPanel } from "./totp-panel";

export default async function SegurancaPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader
        title="Segurança"
        subtitle="Autenticação de dois fatores (2FA) — obrigatória pra sacar quando ativada."
      />
      <div className="max-w-xl">
        <Card accent>
          <TotpPanel enabled={user.totpEnabled} />
        </Card>
      </div>
    </>
  );
}
