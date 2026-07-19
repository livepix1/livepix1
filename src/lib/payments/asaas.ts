/**
 * Implementação Asaas do PaymentProvider — envolve o cliente existente
 * (src/lib/asaas-client.ts), que permanece INERTE sem ASAAS_API_KEY.
 */

import {
  createCustomer,
  createPixCharge as asaasCreatePixCharge,
  createTransfer as asaasCreateTransfer,
  isAsaasConfigured,
  AsaasNotConfiguredError,
} from "@/lib/asaas-client";
import type {
  PaymentProvider,
  PixChargeResult,
  SubscriptionResult,
  TransferResult,
  NormalizedEvent,
} from "./provider";
import { ProviderNotConfiguredError } from "./provider";

const SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const PROD_URL = "https://api.asaas.com/v3";

function baseUrl(): string {
  const key = process.env.ASAAS_API_KEY ?? "";
  return key.includes("hmlg") ? SANDBOX_URL : PROD_URL;
}

async function asaasFetch<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: unknown } = {}
): Promise<T> {
  if (!isAsaasConfigured()) throw new ProviderNotConfiguredError("ASAAS");
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: process.env.ASAAS_API_KEY as string,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    errors?: { description?: string }[];
  };
  if (!res.ok) {
    throw new Error(data?.errors?.[0]?.description ?? `Erro Asaas (${res.status})`);
  }
  return data as T;
}

interface AsaasWebhookPayload {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    externalReference?: string;
    status?: string;
    value?: number;
    subscription?: string;
    invoiceUrl?: string;
  };
  transfer?: { id?: string; status?: string; value?: number };
  subscription?: { id?: string; externalReference?: string };
}

export const asaasProvider: PaymentProvider = {
  name: "ASAAS",

  isConfigured: () => isAsaasConfigured(),

  async createPixCharge(input): Promise<PixChargeResult> {
    try {
      const customer = await createCustomer({
        name: input.customerName,
        email: input.customerEmail,
      });
      const { charge, qr } = await asaasCreatePixCharge({
        customerId: customer.id,
        value: input.value,
        description: input.description,
        externalReference: input.externalReference,
      });
      return {
        providerId: charge.id,
        qrImage: `data:image/png;base64,${qr.encodedImage}`,
        pixCode: qr.payload,
        receiptUrl: charge.invoiceUrl,
      };
    } catch (err) {
      if (err instanceof AsaasNotConfiguredError) {
        throw new ProviderNotConfiguredError("ASAAS");
      }
      throw err;
    }
  },

  async createSubscription(input): Promise<SubscriptionResult> {
    const customer = await createCustomer({
      name: input.customerName,
      email: input.customerEmail,
    });
    const sub = await asaasFetch<{ id: string; invoiceUrl?: string }>("/subscriptions", {
      method: "POST",
      body: {
        customer: customer.id,
        billingType: "PIX",
        value: input.value,
        nextDueDate: new Date().toISOString().slice(0, 10),
        cycle: input.cycle,
        description: input.description,
        externalReference: input.externalReference,
      },
    });
    return { providerSubId: sub.id, paymentUrl: sub.invoiceUrl };
  },

  async cancelSubscription(providerSubId): Promise<void> {
    await asaasFetch(`/subscriptions/${providerSubId}`, { method: "DELETE" });
  },

  async createTransfer(input): Promise<TransferResult> {
    try {
      const t = await asaasCreateTransfer(input);
      return { providerId: t.id, status: t.status };
    } catch (err) {
      if (err instanceof AsaasNotConfiguredError) {
        throw new ProviderNotConfiguredError("ASAAS");
      }
      throw err;
    }
  },

  parseWebhook(payload: unknown): NormalizedEvent {
    const p = (payload ?? {}) as AsaasWebhookPayload;
    const event = p.event ?? "";
    // id do evento: Asaas manda "id" no envelope; fallback determinístico.
    const eventId =
      p.id ?? `${event}:${p.payment?.id ?? p.transfer?.id ?? "unknown"}`;

    const base = {
      eventId,
      providerId: p.payment?.id ?? p.transfer?.id ?? null,
      externalReference:
        p.payment?.externalReference ?? p.subscription?.externalReference ?? null,
      amount: p.payment?.value ?? p.transfer?.value,
      raw: payload,
    };

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      return {
        ...base,
        kind: p.payment?.subscription ? "subscription.paid" : "payment.paid",
      };
    }
    if (
      event === "PAYMENT_OVERDUE" ||
      event === "PAYMENT_DELETED" ||
      event === "PAYMENT_REFUNDED"
    ) {
      return { ...base, kind: "payment.failed" };
    }
    if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVATED") {
      return { ...base, kind: "subscription.canceled" };
    }
    if (event === "TRANSFER_DONE") return { ...base, kind: "transfer.done" };
    if (event === "TRANSFER_FAILED" || event === "TRANSFER_CANCELLED") {
      return { ...base, kind: "transfer.failed" };
    }
    return { ...base, kind: "unknown" };
  },
};
