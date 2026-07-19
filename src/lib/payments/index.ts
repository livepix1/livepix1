import type { PaymentProvider } from "./provider";
import { asaasProvider } from "./asaas";

export * from "./provider";

/**
 * Provider ativo. Brasil = Asaas. Quando a expansão LatAm chegar, este é o único
 * ponto que decide por país/moeda (Stripe entra aqui sem mexer no resto do app).
 */
export function getProvider(): PaymentProvider {
  return asaasProvider;
}
