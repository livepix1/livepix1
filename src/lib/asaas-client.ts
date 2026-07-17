/**
 * Wrapper mínimo da API do Asaas.
 *
 * INERTE POR PADRÃO: enquanto ASAAS_API_KEY não estiver configurada (placeholder),
 * qualquer chamada lança AsaasNotConfiguredError — NENHUMA requisição real de dinheiro
 * é feita. Isso é intencional nesta fase. Quando o dono colar as chaves reais no
 * .env.local, o cliente passa a funcionar sem mudar código.
 *
 * ⚠️ Antes do go-live com dinheiro real, decidir o modelo (conta única MVP vs
 * subcontas/marketplace) — ver CLAUDE.md do projeto.
 */

const SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const PROD_URL = "https://api.asaas.com/v3";

export class AsaasNotConfiguredError extends Error {
  constructor() {
    super(
      "Asaas não configurado. Defina ASAAS_API_KEY no .env.local para ativar pagamentos."
    );
    this.name = "AsaasNotConfiguredError";
  }
}

export class AsaasError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AsaasError";
    this.status = status;
  }
}

function isConfigured(): boolean {
  const key = process.env.ASAAS_API_KEY;
  return Boolean(key && key.trim() && !key.includes("placeholder"));
}

function baseUrl(): string {
  // Chaves de sandbox do Asaas começam com "$aact_hmlg_" / contêm "hmlg".
  const key = process.env.ASAAS_API_KEY ?? "";
  return key.includes("hmlg") ? SANDBOX_URL : PROD_URL;
}

async function asaasFetch<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: unknown } = {}
): Promise<T> {
  if (!isConfigured()) {
    throw new AsaasNotConfiguredError();
  }

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
    const msg =
      data?.errors?.[0]?.description ?? `Erro Asaas (${res.status})`;
    throw new AsaasError(msg, res.status);
  }
  return data as T;
}

// ---- Tipos mínimos ----
export interface AsaasCustomer {
  id: string;
}
export interface AsaasCharge {
  id: string;
  status: string;
  invoiceUrl?: string;
}
export interface AsaasPixQr {
  encodedImage: string; // base64 da imagem do QR
  payload: string; // copia-e-cola
  expirationDate?: string;
}
export interface AsaasTransfer {
  id: string;
  status: string;
}

/** Cria (ou reaproveita) um customer no Asaas para o pagador. */
export async function createCustomer(input: {
  name: string;
  email: string;
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: { name: input.name, email: input.email },
  });
}

/** Cria uma cobrança PIX e retorna o QR code. */
export async function createPixCharge(input: {
  customerId: string;
  value: number;
  description: string;
  externalReference?: string;
}): Promise<{ charge: AsaasCharge; qr: AsaasPixQr }> {
  const charge = await asaasFetch<AsaasCharge>("/payments", {
    method: "POST",
    body: {
      customer: input.customerId,
      billingType: "PIX",
      value: input.value,
      dueDate: new Date().toISOString().slice(0, 10),
      description: input.description,
      externalReference: input.externalReference,
    },
  });

  const qr = await asaasFetch<AsaasPixQr>(`/payments/${charge.id}/pixQrCode`);
  return { charge, qr };
}

/** Consulta o status de uma cobrança. */
export async function getCharge(chargeId: string): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>(`/payments/${chargeId}`);
}

/** Cria uma transferência (saque) para chave PIX ou conta bancária. */
export async function createTransfer(input: {
  value: number;
  pixKey?: string;
  bank?: { bank: string; agency: string; account: string; ownerName: string };
}): Promise<AsaasTransfer> {
  const body: Record<string, unknown> = { value: input.value };
  if (input.pixKey) {
    body.pixAddressKey = input.pixKey;
    body.operationType = "PIX";
  } else if (input.bank) {
    body.bankAccount = input.bank;
  }
  return asaasFetch<AsaasTransfer>("/transfers", { method: "POST", body });
}

export { isConfigured as isAsaasConfigured };
