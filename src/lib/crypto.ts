/**
 * Cifra simétrica (AES-256-GCM) para segredos que precisam ser recuperados em claro
 * depois (a apiKey da subconta Asaas do criador — precisamos dela pra criar
 * cobranças/saques em nome dele). Nunca usar isso pra senha (senha é hash, não cifra).
 *
 * Chave mestra: CRYPTO_MASTER_KEY no .env, 32 bytes em base64 (gerar com
 * `openssl rand -base64 32`). Sem a chave configurada, encrypt/decrypt lançam erro
 * na hora do uso — não no import — pra não quebrar o build sem segredo real.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recomendado pro GCM

export class CryptoNotConfiguredError extends Error {
  constructor() {
    super(
      "CRYPTO_MASTER_KEY não configurada. Gere uma com `openssl rand -base64 32` e defina no .env.local."
    );
    this.name = "CryptoNotConfiguredError";
  }
}

function getMasterKey(): Buffer {
  const raw = process.env.CRYPTO_MASTER_KEY;
  if (!raw || !raw.trim() || raw.includes("placeholder")) {
    throw new CryptoNotConfiguredError();
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("CRYPTO_MASTER_KEY inválida: precisa decodificar para 32 bytes (base64).");
  }
  return key;
}

/** Cifra um texto em claro. Formato de saída: "iv:authTag:ciphertext" (tudo em base64). */
export function encrypt(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(
    ":"
  );
}

/** Decifra um valor gerado por encrypt(). Lança erro se o formato ou a tag não baterem. */
export function decrypt(encoded: string): string {
  const key = getMasterKey();
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Valor cifrado em formato inválido.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function isCryptoConfigured(): boolean {
  const raw = process.env.CRYPTO_MASTER_KEY;
  return Boolean(raw && raw.trim() && !raw.includes("placeholder"));
}
