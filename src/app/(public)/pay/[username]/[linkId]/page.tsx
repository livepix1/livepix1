import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toNumber, formatBRL } from "@/lib/serialize";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import { PayForm } from "./pay-form";

const TYPE_LABEL: Record<string, string> = {
  VALOR_FIXO: "Pagamento",
  DOACAO: "Doação",
  CONSULTORIA: "Consultoria",
};

export default async function PayPage({
  params,
}: {
  params: { username: string; linkId: string };
}) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
  });
  if (!user) notFound();

  const link = await prisma.paymentLink.findFirst({
    where: { id: params.linkId, userId: user.id },
  });
  if (!link) notFound();

  const fixedValue = link.value !== null ? toNumber(link.value) : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-neon-gradient opacity-70" />
      <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-pixflow-cyan/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-pixflow-magenta/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-pixflow-darker">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name}
                width={112}
                height={112}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="font-display text-3xl text-gradient-neon">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <p className="mt-4 text-sm text-pixflow-cyan">
            {TYPE_LABEL[link.linkType] ?? "Pagamento"} para
          </p>
          <h1 className="mt-0.5 text-2xl">{user.name}</h1>
        </div>

        <Card accent className="p-6">
          <div className="mb-5 border-b border-white/10 pb-5">
            {link.imageUrl && (
              <div className="mb-4 overflow-hidden rounded-xl border border-white/10">
                <Image
                  src={link.imageUrl}
                  alt={link.title}
                  width={600}
                  height={320}
                  className="h-40 w-full object-cover"
                  unoptimized
                />
              </div>
            )}
            <h2 className="text-lg">{link.title}</h2>
            {link.description && (
              <p className="mt-1 text-sm text-white/60">{link.description}</p>
            )}
            <p className="mt-3 font-display text-2xl text-pixflow-slate">
              {fixedValue !== null ? formatBRL(fixedValue) : "Valor livre"}
            </p>
          </div>

          <PayForm linkId={link.id} fixedValue={fixedValue} />
        </Card>

        <div className="mt-6 flex justify-center">
          <Logo />
        </div>
      </div>
    </main>
  );
}
