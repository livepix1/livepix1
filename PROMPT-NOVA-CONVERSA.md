# Prompt para nova conversa — PixLive

> Copie TUDO abaixo da linha e cole no início de uma conversa nova.
> Atualizado em 2026-08-02, após a conclusão do P0 e do P1.

---

Continue o projeto **PixLive** (pasta `C:\Users\user\Downloads\pixflow`).

## Antes de fazer qualquer coisa, leia por completo:

1. `C:\Users\user\Downloads\pixflow\PROJETO.md` — **spec oficial** do roadmap
   (P0-P4) e o status de execução de cada fase. É a fonte da verdade.
2. `C:\Users\user\Downloads\pixflow\CLAUDE.md` — infra, decisões travadas e
   gotchas caros já pagos. Não repita os erros listados lá.

Não presuma nada sobre o estado do código sem ler esses dois primeiro.

---

## Quem é o dono e como trabalhar com ele

- **Adriano, não é dev.** Instruções sempre passo a passo, dizendo ONDE clicar,
  botão exato, frases completas. Nada de jargão solto.
- Ele quer **produto world-class**. Já rejeitou entrega que considerou "casca",
  e com razão.
- **Verificação real é inegociável.** Nunca diga "pronto" sem ter rodado
  `tsc` + `build` + testado o comportamento de verdade **nesta sessão**
  (navegador, curl, ou query direta no banco). Nunca invente.
- Quando algo está bloqueado por credencial que só ele tem, **diga na cara**,
  logo no começo da resposta — não esconda no meio do texto.
- Decisões travadas por ele: **manter o tema escuro neon** (não migrar pro
  tema claro da LivePix, pra não parecer cópia). Referência de QUALIDADE
  visual é o projeto **Agentop** (`apd-clinical-saas`) — copiar o nível de
  acabamento (ícones lucide, micro-interações, riqueza de detalhe), **nunca**
  as cores nem o conteúdo.

---

## Infra (confirme antes de tocar em banco/deploy — os MCPs são globais)

| Item | Valor |
|---|---|
| GitHub | `livepix1/livepix1`, branch `main` |
| Supabase | org **livepix1**, ref **`cnhbynfsksfcngvfdxba`**, us-west-2, Free |
| Vercel | projeto `livepix1`, time **digianperfumes-3532s-projects** |
| Produção | `livepix1.vercel.app` |
| Login do dono | `adrianorosa1@hotmail.com` / `12345` (**senha fraca — sugerir troca**) |

### Gotchas de ambiente (todos custaram tempo real; não redescubra)

- **`git push` trava** por credencial cacheada errada. Correção:
  `printf "protocol=https\nhost=github.com\n\n" | git credential reject`,
  depois tente de novo — de preferência **em background**, porque pode
  demorar mais que o timeout padrão.
- **Porta 3000 costuma estar ocupada por OUTRO projeto** do mesmo Windows
  (Vite do FreteCompare/YLIP). Confira com `netstat -ano | grep ":3000"` e
  **use `PORT=3100 npm run start`** — nunca mate o processo alheio.
- **Clique do Browser pane não funciona** (`viewport 0x0`). Use `form_input`
  pra preencher campos e `.click()` via `javascript_tool` no elemento. Não
  perca tempo com `computer.left_click`.
- **Screenshot costuma falhar.** Verifique por `get_page_text` / `read_page`.
- **`node -e` não carrega o `.env` sozinho.** Pra rodar script com Prisma,
  crie um `.mjs` **dentro da pasta do projeto** (senão não acha
  `node_modules`) que leia o `.env` na mão:
  ```js
  import { readFileSync } from "fs";
  for (const l of readFileSync(".env","utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)="?([^"]*)"?$/); if (m) process.env[m[1]] = m[2];
  }
  const { PrismaClient } = await import("@prisma/client");
  ```

### Se for usar subagentes em paralelo (funcionou bem, mas com regras)

1. **Faça a migração de schema você mesmo e COMMITE antes de disparar** os
   agentes. Se não, os worktrees deles nascem de um commit antigo e o merge do
   git **duplica campos silenciosamente, sem gerar conflito**.
2. Depois de cada merge, confira:
   `grep "^model " prisma/schema.prisma | awk '{print $2}' | sort | uniq -d`
   (tem que voltar vazio).
3. **Um agente já travou sem commitar** — os arquivos ficaram soltos no
   worktree. Se um agente parar sem relatório, rode `git status` no worktree
   dele antes de assumir que o trabalho se perdeu.
4. Liste explicitamente os arquivos que cada agente **não pode** tocar
   (`Sidebar.tsx`, `validators.ts`, schema, webhook) e faça a integração
   central você mesmo depois.

---

## O QUE JÁ ESTÁ PRONTO, TESTADO E NO AR

Tudo commitado e pushado em `livepix1/livepix1`.

**Fundação:** ledger append-only idempotente · página pública do criador
(`/c/[username]`) · widget de alertas OBS com fila persistente · metas ·
extrato com comprovante · assinaturas recorrentes · campanhas/vaquinhas ·
landing AIDA nova · modo autônomo (links de cobrança).

**Segurança e integrações:** 2FA TOTP (implementado na mão, validado contra o
vetor oficial da RFC 6238) obrigatório no saque · rate limit · confirmação de
saque por e-mail (link mágico, ledger só posta após confirmar, testado
inclusive contra duplo-uso do token) · API pública v1 com escopos · webhooks de
saída HMAC · bots Discord/Telegram · OAuth de 4 redes · subcontas Asaas com
split e KYC.

**P0 — Editor de alertas (completo):** variações por critério (faixa de valor,
palavra-chave) com motor de match testado em 3 cenários reais · galeria de
templates · TTS avançado ElevenLabs · upload de áudio próprio.

**P1 — Widgets (completo):** índice em `/widgets` com 8 overlays prontos pro
OBS: Alertas, QR fixo, **Maratona** (conectada ao webhook, testada em 3
cenários), **Ranking**, **Últimos incentivos**, **Vídeo**, **Música** (fila +
controle remoto StreamDeck testado de verdade), **Enquete ao vivo**.

**Pedido de vídeo/música:** configurável por criador em
`/configuracoes/pagina` — o campo aparece no formulário público só quando
ligado (testado nos dois estados).

---

## ⚠️ O BLOQUEIO MAIOR — leia antes de prometer qualquer coisa

O sistema **não move dinheiro de verdade** porque `ASAAS_API_KEY` está
**vazia** no `.env`. Sem ela: nenhum PIX real é gerado, nenhuma assinatura é
cobrada, nenhum saque sai. **Isso não se resolve escrevendo código** — é
credencial que só o Adriano consegue (conta Asaas; o sandbox é grátis).

Ele já disse que ia passar, mas **ainda não passou**. Quando passar:
1. Colar no `.env` local e nas env vars da Vercel.
2. Testar ponta a ponta: gerar QR PIX → simular pagamento no sandbox →
   confirmar que a doação vira `PAID`, o ledger bate e o alerta dispara.
3. **Cadastrar o webhook no painel do Asaas** (feito LÁ, não no código),
   apontando pra `https://livepix1.vercel.app/api/webhooks/asaas` com o mesmo
   token de `ASAAS_WEBHOOK_SECRET`.

### Outras credenciais que deixam features INERTES (código pronto, sem chave)

| Env var | O que destrava |
|---|---|
| `ASAAS_API_KEY` | **Todo o dinheiro** (crítico) |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Realtime do widget + upload de áudio/mídia |
| `ELEVENLABS_API_KEY` | Vozes TTS de alta qualidade |
| `RESEND_API_KEY` | E-mail de confirmação de saque |
| `DISCORD_BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` | Recompensas automáticas |
| `*_OAUTH_CLIENT_ID/SECRET` | Conexões de redes sociais |
| `CRON_SECRET` | Protege os crons em produção |

Pendente também no Supabase: **criar os buckets** `donation-media` e
`alert-sounds` no Storage (o código assume que existem, não os cria).

---

## PRÓXIMO PASSO: P2 — Moderação com IA

Ver `PROJETO.md` pro detalhe. Resumo do que falta:

1. **Moderação automática de TEXTO** — hoje é só um regex de palavrões
   (`src/lib/moderation-words.ts`). Falta: lista de palavras proibidas
   configurável pelo criador + filtro via API de moderação (OpenAI moderation
   ou GPT) + regras em linguagem natural.
2. **Moderação de VOZ/ÁUDIO** — hoje **100% manual**: doação com áudio entra
   em `PENDING_VOICE_REVIEW` e só toca depois que o criador aprova em
   `/moderacao`. Falta: transcrição (Whisper) + bloqueio automático de música
   com direitos autorais, barulho e conteúdo impróprio.

Depois do P2: **P3** (recebíveis com data de liberação, limites diário/mensal,
tiers de recompensa, pontos/gamificação, export com filtro de data) e **P4**
(StreamElements/Streamlabs nativos, concluir OAuth real, equipes multiusuário).

### Decisões em aberto (não construa sem perguntar ao Adriano)

- **Dois providers de TTS coexistem**: OpenAI (`/api/tts`, de uma iteração
  antiga, hoje órfão) e ElevenLabs (`/api/tts/synthesize`, que o widget usa).
  Perguntar se remove o antigo ou mantém os dois como opção.
- **`pause`/`resume` da fila de mídia são no-ops** (não há estado de pausa
  persistido). `skip`/`clear` funcionam. Decidir se vale implementar de fato.
- **Enquete `WEIGHTED`** (voto valendo pelo valor doado): a coluna
  `Poll.voteMode` existe, mas a lógica de peso não foi construída.

---

## Como verificar de verdade (não só "buildou")

Depois de cada mudança relevante:
1. `npx tsc --noEmit`
2. `npm run build`
3. `PORT=3100 npm run start` + teste real (navegador ou curl), conferindo que
   o comportamento mudou de fato
4. Pra qualquer coisa de dinheiro/estado: **confirmar direto no banco** com um
   script `.mjs` dentro do projeto (ver gotcha do `.env` acima)
5. **Limpar os dados de teste do banco depois** — é a conta real do dono
