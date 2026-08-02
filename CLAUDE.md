# PixLive (repo: pixflow) — CLAUDE.md do projeto

> Projeto ISOLADO. Nunca misturar com outros projetos da pasta Downloads.
> Antes de qualquer op de banco/deploy, confirmar os IDs abaixo (os MCPs
> Supabase/Vercel são GLOBAIS e podem apontar pro projeto errado).
>
> ⚠️ **Leia também o plano completo:** `C:\Users\user\.claude\plans\voc-vai-implementar-o-vectorized-sonnet.md`
> — é a fonte da verdade do roadmap (fases F0-F11), decisões travadas e o que falta.

## Identidade / infra

| Item | Valor |
|---|---|
| Nome do produto | **PixLive** (nome de trabalho — risco de colisão com marca "LivePix", ver abaixo) |
| Pasta local | `C:\Users\user\Downloads\pixflow` |
| Stack | Next.js 14 (App Router, TS) · Tailwind (tema neon) · Prisma 6 · NextAuth v4 (JWT) |
| Banco | Supabase org **livepix1** · ref **cnhbynfsksfcngvfdxba** · região us-west-2 · plano Free. Pooler `aws-1-us-west-2.pooler.supabase.com` (6543 app / 5432 migrations). Segredos só em `.env` local (gitignored). |
| GitHub | **`livepix1/livepix1`**, branch `main` (NÃO é mais `adrianrosa1/pixflow` — esse foi abandonado) |
| Vercel | **NO AR** — projeto `livepix1`, time **digianperfumes-3532s-projects** (conta digianperfumes, não é a mesma do CLI local que é adrianorosa2012 — foi deployado pelo navegador). URL: `livepix1-d22ah1zcx-digianperfumes-3532s-projects.vercel.app` |
| Domínio | TBD |

## ⚠️ Push no GitHub trava — problema recorrente e sua solução

O Git Credential Manager já cacheou a conta errada (`adrianrosa1`, dá 403) e trava com
frequência. Se `git push origin main` ficar pendurado ou falhar:
```
printf "protocol=https\nhost=github.com\n\n" | git credential reject
```
depois tente `git push origin main` de novo (roda em background — pode precisar de 2ª
tentativa). Se ficar um processo `git-credential-manager.exe` travado, mate-o antes de
retentar.

## ⚠️ Bug de `next dev` — NÃO perca tempo com isso de novo

Descoberto na sessão de 2026-07-19: ao adicionar um componente client NOVO numa página
que já tinha outros client components, o `next dev` (14.2.35) às vezes quebra com
`TypeError: Cannot read properties of undefined (reading 'call')` e a página fica em
branco — mesmo depois de `rm -rf .next` + `node_modules/.cache` + restart limpo. **Isso é
um bug do modo dev, não do código.** Antes de caçar esse bug: rode
`npm run build && npm run start` (produção) na mesma rota. Se funcionar em produção
(quase sempre funciona), o código está certo — é só ignorar em dev e seguir. Só
investigue de verdade se também quebrar em produção.

Workflow local recomendado pra evitar isso: depois de criar um arquivo `"use client"`
novo, mate o processo na porta 3000/3001, `rm -rf .next` e reinicie o dev server ANTES
de testar a rota que usa esse componente.

## Estado atual (2026-08-02) — Enquetes + mídia do doador + confirmação de saque por e-mail

Construídos em paralelo por 3 subagentes (cada um em worktree isolado, sem
tocar no banco compartilhado) e depois mesclados manualmente por mim
(cuidado extra: cada agente recriou os mesmos campos de schema que eu já
tinha migrado antes de disparar os agentes, porque não commitei o
schema.prisma a tempo — corrigi duplicação de `Donation.mediaUrl/mediaType`
gerada pelo merge automático do git antes de compilar).

- **Enquetes (Polls)** — `Poll`/`PollOption`, CRUD em `dashboard/enquetes`,
  votação pública sem login na página do criador. Testado de ponta a ponta:
  criei enquete real, votei como visitante, voto bateu no banco.
- **Mensagem de áudio/vídeo do doador** — gravação via MediaRecorder no form
  público, upload INERTE (`src/lib/media-upload.ts`, precisa
  `SUPABASE_SERVICE_ROLE_KEY` + bucket `donation-media` criado manualmente no
  Supabase Storage — nada disso existe ainda). Doação com mídia entra em
  `moderationStatus: PENDING_VOICE_REVIEW` e só dispara alerta/TTS depois de
  aprovação manual do criador em `/moderacao` (sem Whisper configurado, é
  100% manual por design).
- **Confirmação de saque por e-mail** — `Withdrawal.status: AWAITING_CONFIRMATION`
  até o link mágico (`/confirmar-saque/[token]`, 1h de validade) ser clicado;
  só aí o ledger `PAYOUT` é postado (nunca antes). Sem `RESEND_API_KEY`
  configurada, o link aparece na tela (modo dev) em vez de ser enviado.
  **Testado de ponta a ponta com dinheiro fictício**: solicitei saque, confirmei
  o link, virou `PENDING` e o ledger só postou depois da confirmação; tentei
  confirmar o mesmo token 2x — segunda vez foi rejeitada (idempotência ok).

Conta real do dono criada nesta sessão: `adrianorosa1@hotmail.com` — senha
inicial fraca (`12345`, abaixo do mínimo de 8 caracteres que o próprio signup
exige), trocar assim que possível.

⚠️ **Gotcha de infra desta sessão**: a porta 3000 pode estar ocupada por
OUTRO projeto do mesmo Windows (ex.: Vite do FreteCompare/YLIP rodando em
`Downloads\fretecompare-deploy\frontend`) — sempre confirme com
`netstat -ano | grep ":3000"` + identificar o processo antes de testar, ou
use uma porta alternativa (`PORT=3100 npm run start`) em vez de matar o
processo alheio.

## Estado atual (2026-08-01, sessão 2) — F2 (resto) + F7 + F4b + F8 + F10 completas

Depois da F6, o dono pediu paridade completa com a LivePix ("super SaaS", sem
copiar literalmente). Pesquisa ao vivo na LivePix confirmou taxas exatas (5%
PIX / 7% cartão / 7% internacional, **3 saques grátis/mês, depois R$0,50** —
corrigi uma afirmação errada que eu tinha posto na landing sobre "2FA no
saque" antes de existir de verdade). Construído nesta leva, cada parte
verificada com `tsc`+`build`+teste real no browser antes de seguir pra
próxima:

- **F2 (resto):** Controle Remoto tipo StreamDeck — `/api/remote/{widgetToken}/
  {skip,pause,resume,replay}`, links GET prontos no painel de Alertas. Testado
  de verdade via curl (pause/resume reais).
- **F7:** 2FA (TOTP, RFC 6238 implementado na mão em `src/lib/totp.ts` — sem
  dependência nova, validado bit-a-bit contra o vetor oficial da RFC) exigido
  no saque quando ativado (`/seguranca`). Rate limit best-effort
  (`src/lib/rate-limit.ts`, tabela `RateLimit`) em login (10/15min por email) e
  em `createDonation` (20/10min por IP). **Testado de ponta a ponta**: gerei o
  segredo, calculei o TOTP real e confirmei a ativação — persistiu cifrado no
  banco (AES-GCM).
- **F4b:** bots Discord/Telegram terminados (não só stub). Assinante informa
  `discordUserId`/`telegramUserId` na hora de assinar; `CreatorPlan` ganhou
  `discordGuildId`. Cron diário `/api/cron/sync-rewards` concede/revoga cargo
  (Discord) ou convite/kick (Telegram) conforme o status da assinatura;
  cancelamento por link mágico já revoga na hora (não espera o cron).
- **F8:** API pública v1 (`/api/v1/donations` GET, `/api/v1/alerts/{action}`
  POST) com API keys (`Bearer`, escopos read/write/alerts,
  `src/lib/api-auth.ts`) + webhooks de saída assinados HMAC-SHA256
  (`src/lib/webhooks.ts`, dispara em `payment.new`). Painel em
  `/configuracoes/api`. **Testado de ponta a ponta** via curl: chave real
  criada, GET autenticado funcionou, e o bloqueio de escopo foi confirmado
  (401 numa chave só-leitura tentando controlar alerta).
- **F10:** Conexões OAuth do criador (Discord/Twitch/Twitter/Kick) —
  `SocialConnection`, fluxo genérico em `src/lib/oauth/` (state assinado HMAC,
  sem tabela extra pra CSRF), painel em `/configuracoes/conexoes`. INERTE sem
  as credenciais OAuth de cada provider.

Tudo cifrado que precisa ser recuperado (2FA secret, OAuth tokens) usa
`src/lib/crypto.ts` (mesmo AES-GCM da F5). API keys usam hash SHA-256
(`src/lib/api-auth.ts`) — nunca precisam ser lidas de volta, só reconhecidas.

⚠️ **Nota de ferramenta desta sessão:** o clique simulado do Browser (`computer`
tool) ficou consistentemente quebrado (`viewport 0x0`, coordenadas erradas tipo
`(0, y)`) — toda ação de clique/submit precisou ser feita via `form_input` (pra
preencher campo controlado do React corretamente) + `.click()` via JS explícito
no elemento (não coordenada). Se isso se repetir, não perca tempo tentando
`computer.left_click` — vá direto pro padrão JS.

## Estado atual (2026-08-01) — F6 completa: landing nova + campanhas/vaquinhas

**F6 (landing de vendas nova + vaquinhas/campanhas) foi construída e verificada
nesta sessão.** A home antiga (copy do "PixFlow" modo autônomo, com a seção
`#receber` genérica) foi substituída por uma landing AIDA focada no criador:
hero com a tagline real (`BRAND.tagline`), bloco de dor, tabela comparativa de
taxas (4% nosso vs ~6% média do mercado, sem citar marcas), grade de 6 recursos,
seção do modo autônomo como diferencial, prova social honesta (beta) e FAQ.
`Logo.tsx` e o `<title>` do app também pararam de hardcodar "PixFlow" e passaram
a ler de `BRAND` — antes disso a aba do navegador nunca refletia o pivô pra
PixLive, o que gerou confusão no início desta sessão.

Vaquinhas/campanhas (`Campaign`, já no schema desde a F0) ganharam CRUD completo:
`dashboard/campanhas` (criar/encerrar/reativar/excluir — excluir vira "cancelar"
se já tiver doação, pra não perder o extrato) e página pública própria em
`/c/[username]/campanhas/[slug]` (nested, não bare-root — evita o bug de
roteamento já documentado), com barra de progresso ao vivo (polling, mesmo
padrão do `GoalsLive` do F3) e doação escopada pra campanha (`createDonation`
ganhou `campaignId` opcional).

Testado nesta sessão: `tsc --noEmit` e `npm run build` limpos, fluxo real no
browser (login, criação de campanha, página pública renderizando progresso e
formulário de doação corretamente). **Nota de infra:** o Supabase
(`cnhbynfsksfcngvfdxba`) pausou por inatividade no meio desta sessão — se voltar
a acontecer, é só reativar no painel do Supabase (Free tier pausa projetos
inativos); não é bug de código.

## Estado atual (2026-07-20) — F0 a F4 completas e no ar; F5 construída em modo INERTE

**F5 (subcontas Asaas + KYC + split + saques) foi implementada nesta sessão, mas
segue 100% INERTE** — pedido de habilitação de marketplace já foi feito ao Asaas,
ainda aguardando aprovação comercial. Nada de dinheiro real se move até essa
aprovação sair E as chaves de produção substituírem os placeholders.

O que existe agora:
- `src/lib/crypto.ts` — AES-256-GCM pra cifrar a apiKey de cada subconta (chave
  mestra em `CRYPTO_MASTER_KEY`, já gerada localmente pra dev — trocar em prod).
- `src/lib/asaas-client.ts` — `createSubAccount` (cria a subconta/KYC) e
  `createTransfer`/`listReceivedPayments` aceitando `apiKey` override (pra operar
  em nome da subconta do criador em vez da master).
- `dashboard/verificacao` — formulário de KYC do criador → cria a subconta,
  guarda `subAccountId`/`walletId`/`apiKeyEnc` em `ProviderAccount`
  (`kycStatus: NONE → PENDING → APPROVED/REJECTED`).
- Split automático: `getCreatorSplit()` em `src/lib/payments/index.ts` — quando o
  criador tem `ProviderAccount.kycStatus = APPROVED`, doações e assinaturas
  (`donations.ts`/`subscriptions.ts`) nascem com split Asaas (líquido direto pra
  subconta, taxa fica na master). Sem subconta aprovada, comportamento antigo
  (tudo pra master) continua idêntico.
- Saque (`/api/asaas/transfer`): se o criador tem subconta aprovada, o saque sai
  de lá (chave própria descriptografada), não da master.
- `/api/cron/reconcile` + `vercel.json` (schedule diário, limite do plano Hobby)
  — compara Donations PAID x extrato Asaas por subconta, só loga divergência
  (não corrige nada sozinho).

Testado nesta sessão: `tsc --noEmit` limpo, `npm run build` limpo, fluxo real no
browser logado como `teste@pixflow.com` — submeteu o formulário de verificação,
recebeu o erro esperado ("Asaas não configurado"), e **nada foi gravado no
banco** (confirmado via Prisma Client direto). Falta testar contra sandbox Asaas
de verdade quando a chave `hmlg` estiver disponível.

## Estado atual (2026-07-20) — F0 a F4 completas, no ar, verificadas

O projeto começou como "PixFlow" (links de pagamento tipo Stripe Payment Links) e
**pivotou pra ser um concorrente direto da Livepix** (livepix.gg) — plataforma de
monetização PIX pra criadores/streamers (doações com alerta na live, TTS, metas,
assinaturas, widget OBS). Ver o plano completo pro roadmap detalhado.

**Já construído, testado (inclusive em build de produção) e commitado:**
- **F0** — ledger financeiro append-only (`LedgerEntry`, idempotente por
  `providerEventId`), abstração de provider de pagamento (`src/lib/payments/`)
- **F1** — página pública do criador em **`/c/[username]`** (não `/[username]` —
  ver nota de roteamento abaixo) com formulário de doação
- **F2** — widget de alertas pro OBS (`/widget/[token]`), fila persistente que
  sobrevive a desconexão, TTS via Web Speech API, controles (pausar/pular/reexibir),
  moderação de texto por palavrão
- **F3** — metas com barra ao vivo, extrato com comprovante por transação (anti-"PIX
  sumiu")
- **F4** — assinaturas recorrentes (`Plan`/`Subscription`), cancelamento por link
  mágico, stub Discord (INERTE, sem bot real ainda)

Modo autônomo original (links de cobrança tipo Stripe) continua intocado:
`/pay/[username]/[linkId]`, dashboard `/meu-link`, `/cobrancas`, `/saques`.

**Próxima fase: F5 — subcontas Asaas + KYC + split + saques reais.** É a fase que
mexe com dinheiro de verdade — **não construir sem confirmação explícita do dono**
(mesma regra de qualquer sessão: dinheiro real é DECISÃO, não TAREFA autônoma).

**Conta de teste** (apagar antes de lançar de verdade): `teste@pixflow.com` /
`teste12345`.

## ⚠️ Roteamento — por que a página do criador é `/c/[username]` e não `/[username]`

Um segmento dinâmico bare na raiz de um route group (`(public)/[username]/`) colidindo
com rotas estáticas irmãs (`login`, `signup`, `dashboard`...) causou o mesmo bug de
"Cannot read properties of undefined (reading 'call')" descrito acima, mas de forma
mais persistente. A correção definitiva foi mover pra `(public)/c/[username]/`. **Não
mover de volta pra raiz.**

## ⚠️ Decisões travadas — NÃO regredir

1. **NextAuth = v4** (`next-auth@^4.24`), sessão **`strategy: "jwt"`**. NÃO migrar pra
   v5/beta nem trocar pra database-sessions: `CredentialsProvider` é incompatível com
   database-sessions.
2. **A tabela `Session` fica intencionalmente vazia.** Existe só porque o
   `PrismaAdapter` a referencia. Não "consertar" isso.
3. **`username` vive no `User`** (não no `PaymentLink`).
4. **Prisma `Decimal` não é serializável** no boundary server→client. Sempre converter
   com `toNumber()`/`formatBRL()` de `src/lib/serialize.ts` antes de passar a client
   components.
5. **Prisma fixado em v6** (o scaffold trouxe v7; foi rebaixado de propósito).
6. **Ledger é append-only.** `LedgerEntry` nunca sofre UPDATE/DELETE — correção =
   novo lançamento `ADJUSTMENT`. Idempotência garantida pelo `providerEventId` unique.
7. **Taxas: 4% PIX / 6% cartão, saque sempre grátis** (`src/lib/fee.ts`,
   `computePlatformFee`) — validar contra as taxas reais da conta Asaas antes do
   go-live, valores ainda são propostos.
8. **Marca centralizada em `src/lib/brand.ts`** — nunca hardcodar "PixLive" em outro
   lugar, pra poder trocar barato se o risco de marca (ver abaixo) exigir.

## ⚠️ Risco de marca — "PixLive" vs "LivePix"

Nome de trabalho tem risco real de colisão (INPI + confusão fonética, é o nome do
concorrente invertido). Antes de domínio/logo definitivos, consultar INPI e ter nome B
na manga. Mitigação técnica já feita: nome só em `src/lib/brand.ts`.

## ⚠️ Asaas / dinheiro real — DECISÃO antes do go-live

Receber PIX de terceiros e sacar = intermediação de pagamento. O correto no Asaas é
**subcontas/marketplace** (cada criador com subconta), não conta única — é exatamente
o que a F5 constrói. `src/lib/asaas-client.ts` e `src/lib/payments/asaas.ts` são
INERTES enquanto a chave for placeholder — nenhuma requisição real de dinheiro é
feita. Habilitação de marketplace no Asaas exige aprovação comercial externa — pedir
isso já, é o maior prazo de espera de toda a lista.
