import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { CancelClient } from "./cancel-client";

export default async function CancelSubscriptionPage({
  params,
}: {
  params: { cancelToken: string };
}) {
  const sub = await prisma.subscription.findUnique({
    where: { cancelToken: params.cancelToken },
    include: { plan: true },
  });
  if (!sub) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card accent className="p-6">
          <p className="mb-1 text-center text-sm text-white/50">Plano</p>
          <p className="mb-4 text-center text-xl text-pixflow-slate">{sub.plan.name}</p>
          <CancelClient cancelToken={params.cancelToken} />
        </Card>
      </div>
    </main>
  );
}
