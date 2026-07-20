import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createTransfer,
  AsaasNotConfiguredError,
  AsaasError,
} from "@/lib/asaas-client";
import { decrypt } from "@/lib/crypto";

/**
 * Processa um saque já solicitado (Withdrawal PENDING), disparando a transferência
 * real no Asaas. INERTE enquanto o Asaas não estiver configurado.
 *
 * ⚠️ Movimento de dinheiro real: no go-live, restringir a admin/aprovação e
 * confirmar o modelo de subcontas. Ver CLAUDE.md.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const withdrawalId = String((body as { withdrawalId?: unknown })?.withdrawalId ?? "");
  if (!withdrawalId) {
    return NextResponse.json({ error: "withdrawalId obrigatório" }, { status: 400 });
  }

  const withdrawal = await prisma.withdrawal.findFirst({
    where: { id: withdrawalId, userId: session.user.id },
  });
  if (!withdrawal) {
    return NextResponse.json({ error: "Saque não encontrado" }, { status: 404 });
  }
  if (withdrawal.status !== "PENDING") {
    return NextResponse.json(
      { error: "Este saque já foi processado" },
      { status: 409 }
    );
  }

  // F5: se o criador já tem subconta aprovada, o saque sai direto de lá (dinheiro
  // que já é dele) — nunca da conta master. Sem subconta, cai no fluxo antigo.
  const providerAccount = await prisma.providerAccount.findUnique({
    where: { userId: session.user.id },
  });
  let apiKeyOverride: string | undefined;
  if (providerAccount?.apiKeyEnc && providerAccount.kycStatus === "APPROVED") {
    try {
      apiKeyOverride = decrypt(providerAccount.apiKeyEnc);
    } catch {
      return NextResponse.json(
        { error: "Erro ao acessar a subconta. Avise o suporte." },
        { status: 500 }
      );
    }
  }

  try {
    const transfer = await createTransfer({
      value: withdrawal.netAmount.toNumber(),
      pixKey: withdrawal.destinationPixKey ?? undefined,
      bank:
        withdrawal.destinationType === "BANK" && withdrawal.destinationBank
          ? {
              bank: withdrawal.destinationBank,
              agency: withdrawal.destinationAgency ?? "",
              account: withdrawal.destinationAccount ?? "",
              ownerName: session.user.name ?? "",
            }
          : undefined,
      apiKey: apiKeyOverride,
    });

    const updated = await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: "PROCESSING", asaasTransferId: transfer.id },
    });

    return NextResponse.json({ status: updated.status, transferId: transfer.id });
  } catch (err) {
    if (err instanceof AsaasNotConfiguredError) {
      return NextResponse.json(
        {
          error: "Saques automáticos ainda não estão ativos (Asaas não configurado).",
          configured: false,
        },
        { status: 503 }
      );
    }
    if (err instanceof AsaasError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Erro ao processar o saque" }, { status: 500 });
  }
}
