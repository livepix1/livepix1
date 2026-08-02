# Handoff PixLive — passado, presente e futuro

> Cole este arquivo inteiro no início de uma conversa nova. Aponte o diretório
> de trabalho pra `C:\Users\user\Downloads\pixflow`.
> Escrito em 2026-08-02, no meio da execução do P1.

---

## 1. ANTES DE QUALQUER COISA: leia estes arquivos por completo

1. `C:\Users\user\Downloads\pixflow\PROJETO.md` — **spec oficial** do roadmap
   (P0 a P4), escrita pelo dono. É a fonte da verdade do que falta.
2. `C:\Users\user\Downloads\pixflow\CLAUDE.md` — infra, decisões travadas,
   gotchas caros já pagos. Não repita os erros listados lá.
3. `C:\Users\user\.claude\plans\voc-vai-implementar-o-vectorized-sonnet.md` —
   plano faseado original (F0-F11), histórico de como chegamos aqui.

Não presuma nada sobre o estado do código sem ler esses três primeiro.

---

## 2. QUEM É O DONO E COMO TRABALHAR COM ELE

- **Adriano, não é dev.** Instruções sempre passo a passo, dizendo ONDE clicar,
  botão exato, frase completa. Nada de jargão solto.
- Ele quer **produto world-class** (referência: Netflix/OpenAI de acabamento).
  Já rejeitou entrega que considerou "casca" — e com razão.
- **Ele valoriza verificação real.** Nunca diga "pronto" sem ter rodado
  `tsc` + `build` + testado no navegador/curl **nesta sessão**. Nunca invente.
- Quando algo está bloqueado por credencial que só ele tem, **diga na cara**,
  não esconda no meio do texto.
- Ele já pediu explicitamente: **manter o tema escuro neon do PixLive**, não
  migrar pro tema claro da LivePix (evitar parecer cópia visual).
- Referência de QUALIDADE visual: o projeto **Agentop** (`apd-clinical-saas`) —
  riqueza de detalhe, ícones lucide, micro-interações. **Não copiar** cores nem
  conteúdo de lá, só o nível de acabamento.

---

## 3. INFRA (confirme antes de tocar em banco/deploy — MCPs são globais)

| Item | Valor |
|---|---|
| GitHub | `livepix1/livepix1`, branch `main` |
| Supabase | org **livepix1**, ref **`cnhbynfsksfcngvfdxba`**, us-west-2, plano Free |
| Vercel | projeto `livepix1`, time **digianperfumes-3532s-projects** |
| Produção | `livepix1.vercel.app` |
| Login do dono | `adrianorosa1@hotmail.com` / senha `12345` (**fraca — sugerir troca**) |
| Conta de teste antiga | `teste@pixflow.com` / `teste12345` |

**Gotchas de ambiente (custaram tempo real nesta sessão):**
- `git push` **trava** por credencial cacheada errada. Correção:
  `printf "protocol=https\nhost=github.com\n\n" | git credential reject` e
  tentar de novo (às vezes precisa rodar em background).
- **Porta 3000 costuma estar ocupada por OUTRO projeto** do mesmo Windows
  (Vite do FreteCompare/YLIP). Sempre confira com
  `netstat -ano | grep ":3000"` e **use `PORT=3100 npm run start`** em vez de
  matar processo alheio.
- O Browser pane (`computer.left_click`) fica com `viewport 0x0` e clique não
  funciona. **Use `form_input` pra preencher campos + `.click()` via
  `javascript_tool` no elemento.** Não perca tempo com `left_click`.
- Screenshot frequentemente falha ("pane not displayed"). Verifique por
  `get_page_text` / `read_page` em vez de imagem.

---

## 4. PASSADO — o que já está PRONTO, TESTADO e NO AR

Tudo commitado e pushado em `livepix1/livepix1`. Último commit no `main`
antes deste handoff: **`f1dfcbd`** (schema do P1).

### Fundação (F0-F4)
Ledger append-only idempotente · página pública `/c/[username]` · widget de
alertas OBS com fila persistente + TTS + moderação · metas · extrato com
comprovante · assinaturas recorrentes com cancelamento por link mágico.

### F5 — Subcontas Asaas (INERTE)
`dashboard/verificacao`, cifra AES-GCM da apiKey da subconta
(`src/lib/crypto.ts`), split automático, saque via subconta, cron de
conciliação. **Nada funciona de verdade sem `ASAAS_API_KEY`** (ver seção 6).

### F6 — Landing nova + Campanhas/Vaquinhas
Landing AIDA focada no criador (substituiu a copy antiga do "PixFlow"),
campanhas com página pública própria e barra de progresso ao vivo.

### F7/F8/F10/F4b + Controle Remoto
- **2FA TOTP** (RFC 6238 implementado na mão, validado contra vetor oficial)
  obrigatório no saque · rate limit em login e doação.
- **API pública v1** (`/api/v1/donations`, `/api/v1/alerts/{action}`) com
  API keys por escopo + webhooks de saída assinados HMAC. **Testado via curl,
  incluindo bloqueio de escopo (401).**
- **Conexões OAuth** Discord/Twitch/Twitter/Kick (INERTE sem credenciais).
- **Bots Discord/Telegram** reais (grant/revoke de cargo/convite) + cron.
- **Controle Remoto StreamDeck**: `/api/remote/{token}/{skip|pause|resume|replay}`.

### Enquetes + mídia do doador + confirmação de saque por e-mail
- Enquetes (`Poll`/`PollOption`) com votação pública. **Testado: criei e votei.**
- Áudio/vídeo do doador com moderação **manual** (sem Whisper) — doação com
  mídia entra em `PENDING_VOICE_REVIEW` e só toca depois de aprovada.
- Confirmação de saque por e-mail (link mágico, 1h). **Testado ponta a ponta:
  ledger só posta DEPOIS da confirmação, e confirmar 2x é bloqueado.**

### Redesign visual do dashboard
lucide-react no lugar de TODOS os emojis (13 arquivos) · Sidebar agrupada em
6 seções com ícone por item · componente `EmptyState` (ícone+texto) ·
Card com hover sutil.

### P0 — Editor de alertas (COMPLETO, commit `3f605ab`)
- **Variações de alerta** (`AlertVariation`): critério por faixa de valor e/ou
  palavra-chave, prioridade, uma sempre "Padrão" (fallback). Motor de match em
  `src/lib/donation-alerts.ts` → `pickAlertVariation()`. **Testado com 3
  cenários reais contra o banco — os 3 bateram certo.**
- **Templates** (`AlertTemplate`): galeria oficial + próprios, aplicar/salvar.
- **TTS avançado**: ElevenLabs (`src/lib/tts-providers.ts`,
  `/api/tts/synthesize`), INERTE sem chave, fallback pro Web Speech API.
- **Upload de áudio próprio** (grava 5s no painel → Supabase Storage bucket
  `alert-sounds`), INERTE sem chave.
- Widget consome tudo isso **com compatibilidade retroativa** — criador sem
  nenhuma variação continua funcionando igual antes.

---

## 5. PRESENTE — P1 CONCLUÍDO ✅ (commit `4e53e1d`, no ar)

> **A seção abaixo (5-antiga) descrevia o P1 em execução e está OBSOLETA.**
> Os 4 agentes terminaram, foram mesclados sem duplicação de schema (a
> precaução de commitar o schema antes funcionou), e o P1 foi testado contra
> banco/servidor real e publicado. Ver `PROJETO.md` seção "P1 CONCLUÍDO" pra
> a lista completa de rotas e limitações conhecidas.
>
> **Próximo passo real: P2 (moderação com IA).**
>
> Duas coisas que aconteceram e valem lembrar:
> 1. O agente da Maratona **travou antes de commitar** — os arquivos ficaram
>    soltos no worktree e foram recuperados manualmente. Se um agente parar
>    sem relatório, **verifique `git status` no worktree dele** antes de
>    assumir que o trabalho se perdeu.
> 2. O agente da Enquete **detectou sozinho** que o schema do worktree dele
>    não tinha `voteMode` e, em vez de inventar a coluna, deixou um valor fixo
>    com TODO e avisou. Corrigido no merge. Esse é o comportamento certo.

---

## 5-antiga (HISTÓRICO) — o que estava acontecendo durante o P1

**Schema do P1 já migrado no banco real e commitado (`f1dfcbd`):**
`MarathonConfig`, `MediaRequest` (kind VIDEO/MUSIC), `Poll.voteMode`.

**4 agentes foram disparados em paralelo, em worktrees isolados.** Se a
conversa anterior morreu antes de eles terminarem, os branches podem existir
ou não. Confira com:

```bash
cd "C:\Users\user\Downloads\pixflow" && git branch -a | grep worktree-agent
```

Branches esperados (cada um = uma feature do P1):

| Branch | Feature | Base |
|---|---|---|
| `worktree-agent-aac7a46143868fca0` | **Vídeo + Música** (fila + controle remoto) | `f1dfcbd` ✅ |
| `worktree-agent-a2e98e4bb9e3a3c85` | **Maratona** | `3f605ab` ⚠️ |
| `worktree-agent-a90e757a4280e213b` | **Ranking + Últimos Incentivos** | `3f605ab` ⚠️ |
| `worktree-agent-ab3ba37f7b4e2ec41` | **Enquete ao vivo** | `3f605ab` ⚠️ |

⚠️ **ATENÇÃO — problema conhecido:** 3 dos 4 agentes partiram de `3f605ab`,
que é ANTERIOR ao commit `f1dfcbd` do schema do P1. Ou seja, o
`prisma/schema.prisma` deles **não tem** `MarathonConfig`/`MediaRequest`/
`voteMode`. Isso já aconteceu antes nesta sessão e a consequência foi:
**o merge automático do git duplicou campos silenciosamente** (sem gerar
conflito). **Ao mesclar, confira o schema campo a campo:**

```bash
grep -c "MarathonConfig\|MediaRequest\|voteMode" prisma/schema.prisma
grep -n "^model " prisma/schema.prisma | awk '{print $2}' | sort | uniq -d
```

O segundo comando deve retornar VAZIO (nenhum model duplicado). Se algum
agente tiver recriado os models, remova a duplicata **mantendo a versão do
`main`** (que é a que bate com o banco real).

### O que FALTA fazer pra fechar o P1 (era o meu próximo passo)

1. **Mesclar os 4 branches** (um por vez, conferindo o schema entre cada um).
2. **Conectar a Maratona ao webhook de pagamento** — o agente criou
   `addMarathonSeconds(creatorId, amount)` em `src/lib/actions/marathon.ts`,
   mas **ninguém chama essa função ainda** (foi intencional: o webhook é
   arquivo compartilhado, ficou pra ser ligado centralmente). Ligar em
   `src/app/api/webhooks/asaas/route.ts`, dentro do `handleDonationPaid`,
   junto com os outros efeitos de doação paga.
3. **Criar o índice central `/widgets`** (`src/app/(dashboard)/widgets/page.tsx`)
   listando todos os overlays com seus links, + adicionar o item "Widgets" na
   `src/components/dashboard/Sidebar.tsx` (nenhum agente mexeu nesses dois
   de propósito, justamente pra você fazer centralmente sem conflito).
4. **Adicionar `widgets` ao `RESERVED_USERNAMES`** em `src/lib/validators.ts`.
5. **Verificar de verdade**: `npx tsc --noEmit`, `npm run build`, e teste real
   no navegador (`PORT=3100 npm run start`, logar com a conta do Adriano,
   abrir cada widget novo). Limpar dados de teste do banco depois.
6. **Commit + push** (confirmar com o Adriano antes de push, como sempre).

---

## 6. O BLOQUEIO MAIOR — leia isto antes de prometer qualquer coisa

O sistema **não move dinheiro de verdade** porque `ASAAS_API_KEY` está
**vazia** no `.env`. Sem ela: nenhum PIX real é gerado, nenhuma assinatura é
cobrada, nenhum saque sai. **Isso não se resolve escrevendo código** — é
credencial que só o Adriano consegue (conta Asaas; o sandbox é grátis).

Ele já disse "JA PASSO PARA VC" mas **ainda não passou**. Quando passar:
1. Colar em `.env` (local) e nas env vars da Vercel (produção).
2. Testar ponta a ponta: gerar QR PIX → simular pagamento no sandbox →
   confirmar que a doação vira `PAID`, o ledger bate e o alerta dispara.
3. **Cadastrar o webhook no painel do Asaas** (isso é feito LÁ, não no
   código) apontando pra `https://livepix1.vercel.app/api/webhooks/asaas`
   com o mesmo token de `ASAAS_WEBHOOK_SECRET`.

**Outras credenciais que deixam features INERTES** (código pronto, sem chave):

| Env var | O que destrava | Onde pegar |
|---|---|---|
| `ASAAS_API_KEY` | **Todo o dinheiro** (crítico) | painel Asaas → Integrações |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Realtime do widget + upload de áudio/mídia | Supabase → Settings → API |
| `ELEVENLABS_API_KEY` | Vozes TTS de alta qualidade | painel ElevenLabs → API Keys |
| `RESEND_API_KEY` | E-mail de confirmação de saque | painel Resend |
| `DISCORD_BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` | Recompensas automáticas | Discord Dev Portal / @BotFather |
| `*_OAUTH_CLIENT_ID/SECRET` | Conexões de redes sociais | cada plataforma |
| `CRON_SECRET` | Protege os crons em produção | você define |

Também pendente do lado do Supabase: **criar os buckets** `donation-media` e
`alert-sounds` no Storage (o código assume que existem, não os cria).

---

## 7. FUTURO — roadmap depois do P1

Ver `PROJETO.md` pra detalhes. Resumo:

- **P2 — Moderação com IA**: moderação automática de texto (GPT/moderation
  API) e de voz/áudio. Hoje é 100% manual.
- **P3 — Financeiro**: recebíveis com data de liberação, limites diário/mensal,
  recompensas por tier, sistema de pontos/gamificação, export com filtro de
  data em todas as listagens.
- **P4 — Integrações**: StreamElements/Streamlabs nativos, concluir OAuth real,
  equipes multiusuário com papéis.
- **Config de conta**: avatar/cores/imagem de fundo, abas de Incentivos,
  alterar username/email/telefone, sessões ativas.

**Decisão em aberto (não construir sem perguntar):** existem DOIS providers de
TTS no código — OpenAI (`/api/tts`, de uma iteração antiga, hoje órfão) e
ElevenLabs (`/api/tts/synthesize`, novo, que o widget usa). Perguntar ao
Adriano se remove o antigo ou mantém os dois como opção.

---

## 8. COMO VERIFICAR DE VERDADE (não só "buildou")

Depois de cada mudança relevante:
1. `npx tsc --noEmit`
2. `npm run build`
3. `PORT=3100 npm run start` + teste real no navegador (logar, exercitar o
   fluxo, conferir console sem erros)
4. Pra qualquer coisa de dinheiro/estado: **confirmar direto no banco** com
   `node -e` + Prisma Client (padrão usado a sessão inteira).
5. **Limpar dados de teste** do banco depois (é a conta real do dono).

Nada de "pronto" sem exercitar o fluxo de ponta a ponta.
