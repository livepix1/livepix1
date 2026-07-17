# PixFlow — CLAUDE.md do projeto

> Projeto ISOLADO. Nunca misturar com outros projetos da pasta Downloads.
> Antes de qualquer op de banco/deploy, confirmar os IDs abaixo (os MCPs
> Supabase/Vercel são GLOBAIS e podem apontar pro projeto errado).

## Identidade / infra

| Item | Valor |
|---|---|
| Nome | PixFlow |
| Pasta | `C:\Users\user\Downloads\pixflow` |
| Stack | Next.js 14 (App Router, TS) · Tailwind · Prisma 6 · NextAuth v4 |
| Banco | Supabase org **livepix1** · ref **cnhbynfsksfcngvfdxba** · região us-west-2 · plano Free. Tabelas criadas (prisma db push). Conexão via pooler `aws-1-us-west-2.pooler.supabase.com` (6543 app / 5432 migrations). Segredos só no `.env.local`. |
| Vercel | PENDENTE |
| GitHub | `adrianrosa1/pixflow` |
| Domínio | TBD |

## Estado atual (fundação)

App completo de pé, SEM dinheiro real. Rotas: landing, login, signup, dashboard,
meu-link, cobranças, saques, perfil, página pública `/pay/[username]/[linkId]`, e as
rotas Asaas (`/api/asaas/generate-qr`, `/api/asaas/transfer`, `/api/webhooks/asaas`).

Falta para ir ao ar: criar Supabase + rodar `prisma migrate deploy`, preencher
`.env.local` (ver `.env.example`), fornecer chaves OAuth/Asaas, e a decisão do
modelo Asaas abaixo.

## ⚠️ Decisões travadas — NÃO regredir

1. **NextAuth = v4** (`next-auth@^4.24`), sessão **`strategy: "jwt"`**. NÃO migrar pra
   v5/beta nem trocar pra database-sessions: `CredentialsProvider` é incompatível com
   database-sessions.
2. **A tabela `Session` fica intencionalmente vazia.** Ela existe só porque o
   `PrismaAdapter` a referencia. Não "consertar" isso.
3. **`username` vive no `User`** (não no `PaymentLink`). A rota
   `/pay/[username]/[linkId]` resolve User por username → PaymentLink por id+dono.
   (Desvio consciente da spec original.)
4. **Prisma `Decimal` não é serializável** no boundary server→client. Sempre converter
   com `toNumber()`/`formatBRL()` de `src/lib/serialize.ts` antes de passar a client
   components.
5. **Prisma fixado em v6** (o scaffold trouxe v7; foi rebaixado de propósito p/ o
   caminho canônico `prisma-client-js` + `.env`).

## ⚠️ Asaas / dinheiro real — DECISÃO antes do go-live

O fluxo "receber PIX de terceiros e sacar" torna o PixFlow um **intermediador de
pagamento**. O correto no Asaas é **subcontas/marketplace** (cada usuário com
subconta), não uma conta única com transferências manuais. Definir isso ANTES de ligar
`ASAAS_API_KEY`. O cliente (`src/lib/asaas-client.ts`) é INERTE enquanto a chave for
placeholder — nenhuma requisição real de dinheiro é feita.

## Taxa de saque

Fixa em `WITHDRAWAL_FEE_FIXED = R$ 1,75` (`src/lib/fee.ts`). Ajustar conforme a
política real antes do lançamento.
