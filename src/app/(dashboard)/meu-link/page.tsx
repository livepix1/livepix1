import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LinkForm } from "./link-form";

export default async function MeuLinkPage() {
  const user = await requireUser();
  const link = await prisma.paymentLink.findFirst({ where: { userId: user.id } });

  const base = process.env.NEXTAUTH_URL || "";
  const publicLink =
    user.username && link ? `${base}/pay/${user.username}/${link.id}` : null;

  const initial = link
    ? {
        linkType: link.linkType,
        title: link.title,
        description: link.description ?? "",
        value: link.value !== null ? String(toNumber(link.value)) : "",
        imageUrl: link.imageUrl ?? "",
      }
    : null;

  return (
    <>
      <PageHeader
        title="Meu Link"
        subtitle="Configure a página que seus clientes usam para pagar você."
      />
      <Card accent className="max-w-2xl">
        <LinkForm
          initial={initial}
          publicLink={publicLink}
          usernameMissing={!user.username}
        />
      </Card>
    </>
  );
}
