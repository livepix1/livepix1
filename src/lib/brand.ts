/**
 * Marca centralizada — ÚNICO lugar onde o nome do produto aparece hardcoded.
 * ⚠️ "PixLive" tem risco de colisão com a marca "LivePix" (INPI). Se o dono
 * decidir renomear, muda AQUI e o app inteiro acompanha.
 */
export const BRAND = {
  name: "PixLive",
  tagline: "Receba PIX na sua live com alerta na tela",
  domain: "pixlive.app", // provisório — definir com a decisão de marca
  supportEmail: "suporte@pixlive.app",
  /** Taxas da plataforma (validar com as taxas reais do Asaas antes do go-live). */
  fees: {
    pixPercent: 4,
    cardPercent: 6,
    withdrawalFee: 0, // saque sempre grátis — diferencial
  },
} as const;
