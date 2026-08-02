import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { BRAND } from "@/lib/brand";
import { formatBRL } from "@/lib/serialize";

const PAINS = [
  {
    title: "Taxas que corroem seu apoio",
    text: "Plataformas cobram 5-7% por transação e ainda somam uma taxa fixa no saque — o dinheiro que seu público te dá vira menos do que parece.",
  },
  {
    title: "PIX direto expõe seus dados",
    text: "Passar sua chave PIX na live ou na bio expõe CPF, telefone ou e-mail pra qualquer estranho — e você não tem como cobrar recorrência nem organizar quem te apoia.",
  },
  {
    title: "Zero visibilidade sobre quem te sustenta",
    text: "Sem página, sem histórico, sem ranking: você não sabe quem são seus maiores apoiadores nem quando alguém para de contribuir.",
  },
];

const CARDS = [
  {
    title: "Alertas na tela + TTS",
    text: "Doação cai, alerta aparece na live com som, GIF e voz lendo a mensagem — configurável, com fila que nunca perde um alerta mesmo se a internet cair.",
  },
  {
    title: "Assinaturas recorrentes",
    text: "Planos mensais com recompensas, cobrança automática via PIX ou cartão, cancelamento por link — sem exigir login de quem assina.",
  },
  {
    title: "Recompensas Discord/Telegram",
    text: "Assinante entra automaticamente no servidor certo, com o cargo certo, sem você gerenciar nada na mão.",
  },
  {
    title: "Widget pra qualquer software de live",
    text: "Um link de browser source funciona no OBS, Streamlabs, StreamElements ou qualquer encoder que aceite overlay — sem plugin proprietário.",
  },
  {
    title: "Vaquinhas e campanhas",
    text: "Crie uma campanha com meta e barra de progresso ao vivo pra um projeto específico — equipamento novo, evento, causa — com página própria pra compartilhar.",
  },
  {
    title: "Segurança e saque sempre grátis",
    text: "Extrato imutável com comprovante por transação (nunca mais um \"PIX sumiu\") e — diferente do resto do mercado, que libera só 3 saques grátis por mês — sacar nunca custa nada, nenhuma vez.",
  },
];

const FAQ = [
  {
    q: "Meus dados pessoais aparecem pra quem doa?",
    a: "Não. Quem apoia só vê seu nome de exibição e a página pública — sua chave PIX, CPF e dados bancários nunca ficam expostos.",
  },
  {
    q: "Quanto tempo demora pra sacar?",
    a: "O saque é sempre grátis e cai direto na sua chave PIX ou conta bancária, sem taxa fixa por operação.",
  },
  {
    q: "Preciso ter CNPJ?",
    a: "Não. Você pode receber como pessoa física (CPF) ou como CNPJ/MEI — o cadastro se adapta ao seu caso.",
  },
  {
    q: "Funciona com qual software de live?",
    a: "Qualquer um que aceite uma fonte de navegador (browser source): OBS, Streamlabs, StreamElements e outros.",
  },
  {
    q: "Tem fidelidade ou mensalidade?",
    a: "Não. É grátis pra entrar, sem mensalidade — você só paga a taxa por transação quando recebe um apoio.",
  },
];

const COMPARE_AMOUNTS = [10, 50, 100];
const MARKET_AVG_PERCENT = 6; // média aproximada da faixa 5-7% cobrada por outras plataformas do setor

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-neon-gradient" />
          <div className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-pixflow-cyan/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-pixflow-magenta/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <div className="animate-fade-up">
              <span className="inline-block rounded-full border border-pixflow-cyan/30 bg-pixflow-cyan/5 px-3 py-1 text-xs font-medium text-pixflow-cyan">
                Beta — seja um dos primeiros criadores
              </span>
              <h1 className="mt-6 text-4xl leading-tight sm:text-5xl lg:text-6xl">
                {BRAND.tagline}.{" "}
                <span className="text-gradient-neon">
                  Taxa de {BRAND.fees.pixPercent}% — e saque sempre grátis.
                </span>
              </h1>
              <p className="mt-5 max-w-md text-lg text-pixflow-slate/70">
                O motor de monetização completo do criador brasileiro: alertas na live,
                assinaturas, metas, vaquinhas e widget pra qualquer software — tudo num
                painel só.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg" fullWidth>
                    Quero começar a receber agora
                  </Button>
                </Link>
                <a href="#recursos">
                  <Button variant="outline" size="lg" fullWidth>
                    Ver como funciona
                  </Button>
                </a>
              </div>
            </div>

            <div className="relative animate-fade-up">
              <div className="absolute -inset-4 rounded-3xl bg-neon-gradient opacity-60 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-neon-cyan">
                <Image
                  src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=900&q=80&auto=format&fit=crop"
                  alt="Streamer recebendo alerta de doação na tela"
                  width={900}
                  height={1000}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* MENU HORIZONTAL */}
        <section className="border-y border-white/10 bg-pixflow-darker/50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 text-sm text-pixflow-slate/60 sm:px-6">
            <span className="font-medium text-pixflow-slate">Feito para:</span>
            <span className="hover:text-pixflow-cyan">Streamers</span>
            <span className="hover:text-pixflow-cyan">Criadores de conteúdo</span>
            <span className="hover:text-pixflow-cyan">Comunidades</span>
            <span className="hover:text-pixflow-cyan">Podcasters</span>
          </div>
        </section>

        {/* DOR */}
        <section id="dor" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl">Receber apoio hoje é mais difícil do que devia</h2>
            <p className="mt-3 text-pixflow-slate/60">
              Se você já tentou monetizar sua audiência, provavelmente esbarrou nisso.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PAINS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-7"
              >
                <h3 className="text-xl">{p.title}</h3>
                <p className="mt-2 text-sm text-pixflow-slate/60">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SOLUÇÃO / COMPARATIVO */}
        <section id="comparativo" className="bg-pixflow-darker/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl sm:text-4xl">
                Taxa menor significa mais dinheiro no seu bolso
              </h2>
              <p className="mt-3 text-pixflow-slate/60">
                Comparado à média cobrada por outras plataformas do setor (sem citar
                marcas — a conta fala por si).
              </p>
            </div>

            <div className="mt-12 overflow-x-auto">
              <table className="mx-auto w-full max-w-2xl border-collapse overflow-hidden rounded-2xl border border-white/10 text-sm">
                <thead>
                  <tr className="bg-pixflow-dark text-left text-pixflow-slate/70">
                    <th className="px-4 py-3 font-medium">Doação recebida</th>
                    <th className="px-4 py-3 font-medium text-pixflow-cyan">
                      Com {BRAND.name} ({BRAND.fees.pixPercent}%)
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Média do mercado (~{MARKET_AVG_PERCENT}%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_AMOUNTS.map((amount) => {
                    const ours = amount - (amount * BRAND.fees.pixPercent) / 100;
                    const market = amount - (amount * MARKET_AVG_PERCENT) / 100;
                    return (
                      <tr key={amount} className="border-t border-white/10">
                        <td className="px-4 py-3 text-pixflow-slate">{formatBRL(amount)}</td>
                        <td className="px-4 py-3 font-medium text-emerald-400">
                          {formatBRL(ours)}
                        </td>
                        <td className="px-4 py-3 text-white/50">{formatBRL(market)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-white/40">
              Simulação didática com taxa média aproximada do setor (5-7% por transação
              PIX). Valores exatos variam por plataforma e método de pagamento.
            </p>
          </div>
        </section>

        {/* RECURSOS (6 cards) */}
        <section id="recursos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl">Tudo que você precisa, num painel só</h2>
            <p className="mt-3 text-pixflow-slate/60">
              Da primeira doação à assinatura recorrente — sem juntar cinco ferramentas.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {CARDS.map((c) => (
              <div
                key={c.title}
                className="group rounded-2xl border border-white/10 bg-pixflow-darker/50 p-7 transition-colors hover:border-pixflow-cyan/40"
              >
                <h3 className="text-xl">{c.title}</h3>
                <p className="mt-2 text-sm text-pixflow-slate/60">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MODO AUTÔNOMO */}
        <section id="autonomo" className="bg-pixflow-darker/40 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <span className="inline-block rounded-full border border-pixflow-magenta/30 bg-pixflow-magenta/5 px-3 py-1 text-xs font-medium text-pixflow-magenta">
                Exclusivo {BRAND.name}
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl">
                Também cobra fora da live — com um link só
              </h2>
              <p className="mt-4 text-pixflow-slate/60">
                Além do modo criador, você também pode gerar links de cobrança avulsos —
                pra venda de produto, consultoria ou serviço — sem precisar de maquininha
                ou emitir boleto. Nenhum concorrente do setor de monetização de live
                oferece isso junto.
              </p>
              <Link href="/signup" className="mt-6 inline-block">
                <Button variant="outline">Conhecer o modo autônomo</Button>
              </Link>
            </div>
            <ul className="grid gap-3">
              {[
                "Valor fixo, doação livre ou consultoria",
                "Página de pagamento pronta e responsiva",
                "Mesmo painel de saldo, extrato e saques",
                "Ideal pra freelancers e pequenos negócios",
              ].map((b) => (
                <li
                  key={b}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-pixflow-dark px-4 py-3"
                >
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-pixflow-cyan/15 text-pixflow-cyan">
                    <Check size={14} />
                  </span>
                  <span className="text-sm text-pixflow-slate/80">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* PROVA SOCIAL HONESTA */}
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl sm:text-4xl">Estamos no começo — e isso é bom pra você</h2>
          <p className="mt-4 text-pixflow-slate/60">
            {BRAND.name} está em beta: sem números inflados, sem depoimento inventado.
            Quem entra agora ajuda a moldar o produto e fica entre os primeiros criadores
            da plataforma.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-pixflow-darker/40 py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl sm:text-4xl">Perguntas frequentes</h2>
            </div>
            <div className="mt-10 grid gap-4">
              {FAQ.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-white/10 bg-pixflow-dark p-5"
                >
                  <p className="font-medium text-pixflow-slate">{item.q}</p>
                  <p className="mt-2 text-sm text-pixflow-slate/60">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="relative overflow-hidden py-24">
          <div className="pointer-events-none absolute inset-0 bg-neon-gradient opacity-70" />
          <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h2 className="text-3xl sm:text-4xl">Comece a receber ainda hoje</h2>
            <p className="mt-4 text-pixflow-slate/70">
              Crie sua conta grátis, monte sua página e mande o link pra sua audiência em
              minutos.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/signup">
                <Button size="lg">Quero começar a receber agora</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
