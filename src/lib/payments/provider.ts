/**
 * Abstração de provider de pagamento.
 * Implementação atual: Asaas (Brasil). Futuro: Stripe (LatAm) — NÃO construir agora.
 * Todos os providers seguem o padrão INERTE: sem credenciais no env, lançam
 * ProviderNotConfiguredError em vez de tocar em dinheiro real.
 */

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(
      `Provider de pagamento "${provider}" não configurado. Defina as credenciais no .env.local.`
    );
    this.name = "ProviderNotConfiguredError";
  }
}

export interface PixChargeResult {
  /** id da cobrança no provider */
  providerId: string;
  /** imagem do QR em data URI */
  qrImage: string;
  /** copia-e-cola */
  pixCode: string;
  /** url de comprovante/fatura quando existir */
  receiptUrl?: string;
}

export interface SubscriptionResult {
  providerSubId: string;
  /** link/QR do primeiro pagamento quando aplicável */
  paymentUrl?: string;
}

export interface TransferResult {
  providerId: string;
  status: string;
}

/** Evento normalizado vindo de webhook de qualquer provider. */
export interface NormalizedEvent {
  /** id único do evento no provider (idempotência do ledger) */
  eventId: string;
  kind:
    | "payment.paid"
    | "payment.failed"
    | "subscription.paid"
    | "subscription.canceled"
    | "transfer.done"
    | "transfer.failed"
    | "unknown";
  /** id da cobrança/assinatura/transferência no provider */
  providerId: string | null;
  /** referência externa que NÓS mandamos ao criar (nosso id interno) */
  externalReference: string | null;
  amount?: number;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  isConfigured(): boolean;

  createPixCharge(input: {
    customerName: string;
    customerEmail: string;
    value: number;
    description: string;
    externalReference: string;
    /** walletId da subconta do criador (F5) — quando presente, a cobrança nasce
     *  com split: o percentual líquido vai direto pra subconta, a taxa fica na master. */
    splitWalletId?: string;
    splitNetPercent?: number;
  }): Promise<PixChargeResult>;

  createSubscription(input: {
    customerName: string;
    customerEmail: string;
    value: number;
    description: string;
    externalReference: string;
    cycle: "MONTHLY";
    splitWalletId?: string;
    splitNetPercent?: number;
  }): Promise<SubscriptionResult>;

  cancelSubscription(providerSubId: string): Promise<void>;

  createTransfer(input: {
    value: number;
    pixKey?: string;
    bank?: { bank: string; agency: string; account: string; ownerName: string };
  }): Promise<TransferResult>;

  /** Converte o payload bruto do webhook num evento normalizado. */
  parseWebhook(payload: unknown): NormalizedEvent;
}
