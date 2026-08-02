# PixLive — Contexto do Projeto e Roadmap

> Documento fornecido pelo dono do projeto (2026-08-02) como especificação
> oficial do estado atual e do roadmap priorizado. Ver também `CLAUDE.md`
> (infra, decisões travadas, gotchas) e o plano faseado em
> `C:\Users\user\.claude\plans\voc-vai-implementar-o-vectorized-sonnet.md`.

## Visão geral
PixLive é um clone/concorrente do LivePix: plataforma que permite streamers
receberem PIX durante lives com alertas na tela (overlay OBS), TTS, metas,
enquetes, assinaturas recorrentes e página pública de doação.

- Frontend: Next.js + React + Tailwind. Tema dark, gradiente cyan→pink.
- Gateway PIX: Asaas (cria subconta/split por usuário via verificação).
- Overlay OBS: rota pública /widget/{token} carregada como fonte de navegador.
- Tempo real: WebSocket para push de alertas ao overlay (hoje: Supabase Realtime
  Broadcast, com fallback por polling — ver `src/lib/realtime.ts`).
- URL produção: livepix1.vercel.app

## Layout do painel (sidebar, já implementado)
Agrupada em seções:
- PAINEL: Dashboard (/dashboard), Minha Página (/configuracoes/pagina)
- MONETIZAÇÃO: Alertas (/alertas), Metas (/metas), Campanhas (/campanhas),
  Enquetes (/enquetes), Assinaturas (/assinaturas), Moderação (/moderacao)
- MODO AUTÔNOMO: Meu Link (/meu-link), Cobranças (/cobrancas)
- FINANCEIRO: Extrato (/extrato), Saques (/saques), Verificação (/verificacao)
- INTEGRAÇÕES: Conexões (/configuracoes/conexoes), API (/configuracoes/api)
- Sair
Header: nome do usuário + email + avatar + sino de notificações.

## ESTADO ATUAL — o que JÁ está implementado

### Dashboard (/dashboard)
Saudação, card Saldo disponível + botão Sacar. Cards: Total recebido,
Cobranças pagas, Pendentes. "Seu link de pagamento" + Criar link.
Lista "Últimas cobranças" + Ver todas.

### Alertas (/alertas)  [núcleo do produto]
- Widget de alertas OBS: URL /widget/{token} (800x600) + botão Copiar.
- Overlay de QR fixo: /widget/{token}/qr + Copiar.
- Botões: Testar alerta, Regenerar token.
- Fila de alertas: Pular atual, Pausar fila, Limpar pendentes.
- Controle Remoto (StreamDeck): links /api/remote/{token}/skip|pause|resume|replay + Copiar.
- Aparência: Som (URL), GIF/imagem (URL), Duração (ms), TTS on/off,
  "TTS a partir de R$", "Alerta a partir de R$", Salvar configuração.
- Lista "Últimos alertas".

### Meu Link (/meu-link)
Tipo de link: Valor fixo / Doação (valor livre) / Consultoria.
Campos: Título, Descrição (500 chars), Valor, Imagem (URL). Salvar.

### Minha Página (/configuracoes/pagina)
Nome exibição, Bio (300 chars), Banner (URL), Doação mínima,
Tamanho máx. mensagem (50-400), visibilidade (Ativa/Oculta),
URL pública /c/{usuario} + Copiar.

### Metas (/metas)
Nova meta: Título, Valor alvo, Termina em. Barra de progresso na página pública.

### Campanhas (/campanhas)
Vaquinha com página própria. Título, slug (URL), Descrição, Meta, Termina em.

### Enquetes (/enquetes)
Pergunta + até 6 opções. Resultado na página pública.

### Assinaturas (/assinaturas)
Plano recorrente: Nome, Preço mensal, Descrição, Vantagens (uma por linha),
Servidor Discord (ID), Cargo Discord (ID), Grupo Telegram (ID).

### Moderação (/moderacao)
Lista de mensagens sinalizadas (texto) + fila de áudio/vídeo pendente.
(Apenas revisão manual — sem IA ainda.)

### Cobranças (/cobrancas)
Lista de pagamentos, filtros 7 dias / Mês / Tudo.

### Extrato (/extrato)
Movimentações com comprovante + Exportar CSV.

### Saques (/saques)
Saldo disponível, valor, destino (Chave PIX / Conta bancária),
cálculo de taxa + "você recebe", histórico de saques.

### Verificação (/verificacao)
Cria subconta Asaas. Tipo (PF/MEI/LTDA/Associação), CPF, nascimento,
celular, endereço, número, bairro, CEP, renda mensal.

### Conexões (/configuracoes/conexoes)
OAuth (placeholder): Discord, Twitch, Twitter/X, Kick.

### API & Webhooks (/configuracoes/api)
API Keys (escopos: Leitura / Controle de alertas / Escrita) via
Authorization: Bearer contra /api/v1/*. Webhooks de saída com
X-PixLive-Signature (HMAC-SHA256), eventos: novo pagamento / novo alerta.

## O QUE FALTA — Roadmap priorizado (baseado no LivePix oficial)

### P0 — Diferenciais críticos do editor de alertas
1. VARIAÇÕES de alerta: criar múltiplas variações com critérios
   (faixa de valor mín/máx, palavra-chave na mensagem). Cada variação com
   template e config próprios. Uma "Padrão" de fallback.
2. TEMPLATES de alerta: galeria de templates oficiais + "meus templates".
   Preview visual. (Futuro: templates da comunidade.)
3. TTS avançado: seleção de VOZ (integrar AWS Polly ou ElevenLabs —
   ex. voz PT-BR), volume da voz, duração mín E máx do alerta separadas,
   controle de volume/duração do som, toggles "falar nome do autor" e
   "falar o valor".
4. Upload de áudio próprio (não só URL) para o som do alerta.

### P1 — Widgets/overlays faltantes (cada um é rota /widget/{token}/{tipo})
5. MARATONA: cronômetro que aumenta X segundos a cada incentivo recebido.
6. RANKING: top doadores da transmissão (período configurável).
7. VÍDEO (song/video request YouTube): fila de vídeos enviados pelo público
   + controle remoto (pausar/pular/reexibir/limpar).
8. MÚSICA: pedidos de música com fila e controles.
9. ÚLTIMOS INCENTIVOS: lista dos últimos recebidos.
10. ENQUETE AO VIVO: overlay com votos em tempo real (regra: voto único vs
    voto por valor somado).

### P2 — Moderação com IA
11. Moderação automática de TEXTO: palavras proibidas configuráveis +
    filtro via GPT/moderation API + regras em linguagem natural.
12. Moderação de VOZ/ÁUDIO: bloquear música (direitos autorais), barulhos,
    conteúdo impróprio. Lista de termos bloqueados gerenciável.

### P3 — Financeiro e monetização
13. Recebíveis: liberação futura de pagamentos (cartão/internacional) com data.
14. Limites diários/mensais por conta.
15. Recompensas/tiers de assinatura com entrega automática (cargo Discord etc).
16. Sistema de PONTOS/gamificação (acumular e gastar pontos em mensagens).
17. Exportação com filtro de intervalo de datas em todas as listagens.

### P4 — Integrações e colaboração
18. Integração nativa StreamElements e StreamLabs (além de OAuth de redes).
19. Concluir OAuth real de Twitch/Kick/Discord/Twitter.
20. EQUIPES: gestão multiusuário com papéis/permissões.
21. Text-to-Speech com fila de aprovação manual vs automática por config.

## Configurações de conta a adicionar (do LivePix)
- Perfil: avatar, cor principal, cor de fundo, imagem de fundo.
- Incentivos com abas: Mensagens / Mídia / Assinaturas / Pontos.
- Minha Conta: alterar username, email, telefone, desativar conta.
- Segurança: 2FA, sessões.

## Notas técnicas
- Fila de alertas em Redis; WebSocket para overlay. (Nota: a implementação
  atual usa Postgres + Supabase Realtime Broadcast, não Redis — ver
  `src/lib/realtime.ts` e o model `AlertEvent`. Funciona e já foi testado;
  migrar pra Redis só se motivo de performance real aparecer.)
- Endpoints /api/remote/{token}/{acao} já servem StreamDeck — reutilizar
  padrão para vídeos e músicas.
- Manter identidade visual PRÓPRIA (nome, textos, assets) — não copiar
  marca/textos/áudios do LivePix (evitar problemas de copyright/marca).
- Regenerar token deve invalidar URLs antigas do overlay.

## Status de execução (atualizado pelo Claude Code)

### ✅ P0 CONCLUÍDO (2026-08-02)
Construído por 3 subagentes em paralelo (worktrees isolados, sem tocar no
banco ao mesmo tempo — schema migrado por mim antes de disparar os agentes)
+ integração da UI feita depois:

- **Variações de alerta** (`AlertVariation`) — cada uma com critério (faixa
  de valor mín/máx, palavra-chave na mensagem), prioridade, e uma sempre
  marcada "Padrão" (fallback). Motor de match em
  `src/lib/donation-alerts.ts` (`pickAlertVariation`) — **testado com 3
  cenários reais contra o banco**: valor bate critério, palavra-chave bate
  com prioridade maior, nenhum critério bate → cai no padrão. Os 3 bateram
  certo.
- **Templates** (`AlertTemplate`) — galeria oficial + "meus templates",
  aplicar num clique (copia som/gif/duração pra uma variação).
- **TTS avançado** — provider ElevenLabs (`src/lib/tts-providers.ts`,
  `/api/tts/synthesize`), INERTE sem `ELEVENLABS_API_KEY`. Nota: já existia
  um segundo provider (`/api/tts`, OpenAI) de uma iteração anterior — o
  widget agora prioriza ElevenLabs (`ttsProviderVoiceId`) e cai pro Web
  Speech API do navegador se não tiver; o provider OpenAI antigo ficou
  órfão, sem uso — decidir no futuro se remove ou também liga.
- **Upload de áudio próprio** pro som do alerta — grava 5s no painel,
  sobe pro Supabase Storage (bucket `alert-sounds`, mesmo padrão INERTE do
  resto do projeto — precisa `SUPABASE_SERVICE_ROLE_KEY` configurada e o
  bucket criado manualmente no Supabase pra funcionar de verdade).
- **Widget (`widget-client.tsx`)** atualizado pra usar os campos por
  variação (som/gif/duração/volume/voz) com prioridade sobre a config
  legada — compatibilidade retroativa garantida (criador sem nenhuma
  variação continua funcionando exatamente como antes).

Testado: `tsc`+`build` limpos, criação de variação real via navegador
(persistiu no banco), motor de match validado com dados reais.

### Bloqueio maior do sistema, fora do P0-P4
`ASAAS_API_KEY` vazia no `.env` — sem ela, nenhum PIX real é gerado, nenhuma
assinatura é cobrada, nenhum saque sai de verdade. Isso não é resolvido
escrevendo código; é uma credencial que só o dono consegue (conta Asaas,
sandbox é grátis). Aguardando o dono passar a chave.

### Próximo: P1 (widgets faltantes: Maratona, Ranking, Vídeo, Música,
Últimos Incentivos, Enquete ao vivo) — ainda não iniciado.
