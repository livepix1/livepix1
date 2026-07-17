import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { payerSchema } from "@/lib/validators";
import {
  createCustomer,
  createPixCharge,
  AsaasNotConfiguredError,
  AsaasError,
} from "@/lib/asaas-client";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const linkId = String((body as { linkId?: unknown }).linkId ?? "");
  const parsed = payerSchema.safeParse(body);
  if (!linkId || !parsed.success) {
    return NextResponse.json(
      { error: "Dados do pagamento inválidos" },
      { status: 400 }
    );
  }

  const link = await prisma.paymentLink.findUnique({
    where: { id: linkId },
    include: { user: true },
  });
  if (!link) {
    return NextResponse.json({ error: "Link não encontrado" }, { status: 404 });
  }

  // Valor: fixo do link, ou o informado pelo pagador (doação/variável).
  const amount =
    link.value !== null ? link.value.toNumber() : parsed.data.amount;
  if (!(amount > 0)) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  try {
    // Fluxo real (só roda com ASAAS_API_KEY configurada).
    const customer = await createCustomer({
      name: parsed.data.payerName,
      email: parsed.data.payerEmail,
    });

    const charge = await prisma.charge.create({
      data: {
        paymentLinkId: link.id,
        userId: link.userId,
        payerName: parsed.data.payerName,
        payerEmail: parsed.data.payerEmail,
        payerMessage: parsed.data.payerMessage || null,
        amount: new Prisma.Decimal(amount),
        status: "PENDING",
      },
    });

    const { charge: asaasCharge, qr } = await createPixCharge({
      customerId: customer.id,
      value: amount,
      description: link.title,
      externalReference: charge.id,
    });

    await prisma.charge.update({
      where: { id: charge.id },
      data: { asaasChargeId: asaasCharge.id },
    });

    return NextResponse.json({
      chargeId: charge.id,
      qrImage: `data:image/png;base64,${qr.encodedImage}`,
      pixCode: qr.payload,
    });
  } catch (err) {
    if (err instanceof AsaasNotConfiguredError) {
      // Estado inerte: sem chaves, não geramos cobrança real.
      return NextResponse.json(
        {
          error:
            "Pagamentos ainda não estão ativos. O recebedor precisa configurar o Asaas.",
          configured: false,
        },
        { status: 503 }
      );
    }
    if (err instanceof AsaasError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Erro ao gerar o pagamento" },
      { status: 500 }
    );
  }
}
