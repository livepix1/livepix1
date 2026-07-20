# Handoff — continuar o PixLive a partir da F5

Cole isto no início de uma conversa nova com o Claude Code. Aponte o diretório de
trabalho pra `C:\Users\user\Downloads\pixflow` (ou peça pra eu ir até lá) antes de
começar.

---

## Quem sou eu, o que já existe

Este é o projeto **PixLive** (nome de trabalho — repositório ainda se chama `pixflow`
por herança histórica). Começou como um SaaS de links de pagamento tipo Stripe Payment
Links ("PixFlow") e **pivotou pra ser um concorrente direto da Livepix** (livepix.gg) —
plataforma brasileira de monetização via PIX pra criadores de conteúdo/streamers
(doações com alerta na live, TTS, metas, assinaturas recorrentes, widget pro OBS, API).

**Antes de fazer qualquer coisa, leia estes dois arquivos por completo:**
1. `C:\Users\user\Downloads\pixflow\CLAUDE.md` — infra, decisões travadas, gotchas
   caros já pagos (não repita os mesmos erros)
2. `C:\Users\user\.claude\plans\voc-vai-implementar-o-vectorized-sonnet.md` — o plano
   faseado completo (F0 a F11), com o que já foi construído e o que falta

Não presuma nada sobre o estado do código sem ler esses dois arquivos primeiro — eles
foram escritos e atualizados na sessão anterior especificamente pra você não precisar
redescobrir nada.

## Infra (confirme antes de tocar em banco/deploy — MCPs são globais)

| Item | Valor |
|---|---|
| GitHub | `livepix1/livepix1`, branch `main` |
| Supabase | org **livepix1**, ref **`cnhbynfsksfcngvfdxba`**, região us-west-2, plano Free |
| Vercel | projeto `livepix1`, time **digianperfumes-3532s-projects** (NO AR) |
| URL de produção | `livepix1-d22ah1zcx-digianperfumes-3532s-projects.vercel.app` |
| Conta de teste | `teste@pixflow.com` / `teste12345` — **apagar antes do lançamento real** |

⚠️ O `git push` costuma travar por causa de uma credencial cacheada errada. Se travar:
```
printf "protocol=https\nhost=github.com\n\n" | git credential reject
```
e tente de novo (o CLAUDE.md do projeto tem o procedimento completo).

## O que já está pronto, testado de verdade e no ar (F0-F4)

Cada fase abaixo foi verificada com testes reais no navegador (não só build/typecheck)
— incluindo, quando necessário, rodar `next build && next start` pra confirmar que um
bug era só do modo dev do Next e não do código:

- **F0** — ledger financeiro **append-only** (`LedgerEntry`, idempotente por
  `providerEventId`), abstração de provider de pagamento (`src/lib/payments/`,
  hoje só Asaas, Stripe fica pra fase futura de expansão LatAm)
- **F1** — página pública do criador em **`/c/[username]`** (⚠️ não é `/[username]` —
  teve que mudar por um bug de roteamento do Next, ver CLAUDE.md) com formulário de
  doação
- **F2** — widget de alertas pro OBS (`/widget/[token]`) com fila persistente que
  sobrevive a desconexão (testado: alerta gerado com o widget fechado toca ao reabrir),
  TTS via Web Speech API, controles pausar/pular/reexibir, moderação de texto por
  palavrão
- **F3** — metas com barra de progresso ao vivo, extrato financeiro com comprovante
  por transação (o diferencial "anti-PIX sumiu" contra a reclamação real da Livepix)
- **F4** — assinaturas recorrentes (`Plan`/`Subscription` via Asaas), cancelamento por
  link mágico (sem exigir login do assinante), stub de recompensa Discord (código
  pronto, INERTE — falta o bot real, é decisão futura)

O modo autônomo original (links de cobrança tipo Stripe Payment Links) continua intacto
e funcionando: `/pay/[username]/[linkId]`, `/meu-link`, `/cobrancas`, `/saques`.

Tudo commitado e pushado até o commit `7855061` (branch `main`, sincronizado com o
remoto — confira com `git log --oneline -3` e compare local vs
`git ls-remote origin refs/heads/main`).

## Sua tarefa: F5 — subcontas Asaas + KYC + split + saques

Esta é a fase que liga o **dinheiro de verdade**. Meu próprio plano marcou essa fronteira
de propósito: **não construa nada de F5 sem confirmação explícita do dono da conta**
(Adriano) antes de começar — é exatamente o tipo de decisão que "prepara tudo pronto,
apresenta e aguarda o SIM", não uma tarefa pra tocar sozinho.

O que a F5 entrega, segundo o plano:
- `dashboard/verificacao` → cria subconta do criador via API do Asaas (KYC), com a
  apiKey da subconta cifrada (AES-GCM, `src/lib/crypto.ts` — ainda não existe, criar)
- Cobranças passam a ser criadas na subconta do criador, com split automático (taxa →
  conta master, resto → subconta)
- Saques grátis, mínimo R$1, registrados como `PAYOUT` no ledger
- Cron de conciliação comparando `Donation` × extrato real do Asaas
- Tudo segue o padrão **INERTE** já estabelecido (`src/lib/asaas-client.ts`,
  `src/lib/payments/asaas.ts`) — sem chaves reais, nada de dinheiro se move

**Antes de começar a F5, você (a IA que está lendo isso) deve:**
1. Confirmar com o dono se ele já abriu o pedido de habilitação de marketplace/
   subcontas junto ao Asaas (é aprovação comercial externa — o maior prazo de espera de
   toda a lista; se ainda não pediu, sugerir que peça já, em paralelo)
2. Confirmar que ele está de acordo em seguir com a arquitetura de subcontas (é a opção
   correta do ponto de vista regulatório — evita que o produto vire um intermediador de
   pagamento não autorizado)
3. Só depois disso, seguir a F5 exatamente como descrita no plano, fase por fase, com
   verificação real (browser, sandbox Asaas se houver chave `hmlg`) — não apenas
   build/typecheck

## Gotchas caros que já paguei — não repita

1. **Bug do `next dev`:** ao adicionar um componente `"use client"` novo numa página
   que já tinha outros, o dev server às vezes quebra com
   `Cannot read properties of undefined (reading 'call')` e a página fica em branco —
   mesmo com `.next` e `node_modules/.cache` limpos. **Antes de investigar a fundo, rode
   `npm run build && npm run start`** na mesma rota. Se funcionar em produção (quase
   sempre funciona), o problema é só do dev mode — ignore e siga em frente.
2. **Rotas dinâmicas bare na raiz de um route group colidem com rotas estáticas
   irmãs** (foi o caso de `/[username]` vs `/login`, `/signup`, `/dashboard`) e causam o
   mesmo tipo de erro acima, só que persistente. Por isso a página do criador é
   `/c/[username]`. Não crie novos segmentos dinâmicos soltos na raiz de `(public)` ou
   `(dashboard)` sem namespacar.
3. **Prisma 6, não 7** — o scaffold original trouxe v7 (mudou geração de client e
   `prisma.config.ts`), foi rebaixado de propósito. Não atualize sem motivo forte.
4. **`Decimal` do Prisma não serializa** direto pra client components — sempre passar
   por `toNumber()`/`formatBRL()` de `src/lib/serialize.ts`.
5. **Sessão é sempre JWT**, nunca database — `CredentialsProvider` do NextAuth v4 exige
   isso. A tabela `Session` fica vazia de propósito, não é bug.

## Como verificar de verdade (não só "buildou")

Depois de cada mudança relevante: `npx tsc --noEmit`, `npm run build`, e depois teste
real no navegador — logue com a conta de teste, exercite o fluxo de ponta a ponta,
confira o console sem erros. Pra qualquer coisa relacionada a dinheiro: confirme o
efeito no banco direto (`node -e` com Prisma Client é o padrão usado nas sessões
anteriores pra inspecionar `LedgerEntry`, `Donation`, `Subscription` etc. sem precisar
abrir o Supabase Studio).

## Pesquisa de concorrência já feita (não refaça)

A engenharia reversa da Livepix já foi feita duas vezes (uma inicial, ampla, e uma
segunda focada verificando publicamente — sem login — contra a API OpenAPI oficial
deles) e está resumida no plano faseado. **9 features específicas foram confirmadas com
fonte pública real** (Vaquinhas, Planos, Enquetes, Anúncios B2B, Ações Solidárias,
Moderação por IA de voz, Controle Remoto tipo StreamDeck, Conexões OAuth com Discord/
Twitch/Twitter/Kick, e paridade exata dos endpoints da API v2 deles) e já foram
encaixadas nas fases certas do plano (a maioria em F6/F8/F10). Não repita essa pesquisa
do zero — leia a seção "Paridade adicional confirmada" no plano primeiro.
