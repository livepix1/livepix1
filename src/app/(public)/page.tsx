import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";

const STEPS = [
  {
    n: "01",
    title: "Crie seu link",
    text: "Escolha um valor fixo, uma doação livre ou uma consultoria. Leva menos de um minuto.",
  },
  {
    n: "02",
    title: "Compartilhe",
    text: "Mande o link no WhatsApp, Instagram ou onde seu público estiver. Um clique e pronto.",
  },
  {
    n: "03",
    title: "Receba na hora",
    text: "O pagamento cai via PIX e vira saldo na sua conta. Saque quando quiser.",
  },
];

const NICHOS = [
  {
    title: "Criadores de conteúdo",
    text: "Receba apoio e doações da sua audiência com um link fixo na bio.",
    img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80&auto=format&fit=crop",
  },
  {
    title: "Freelancers e consultores",
    text: "Cobre projetos e sessões sem precisar emitir boleto ou usar maquininha.",
    img: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&auto=format&fit=crop",
  },
  {
    title: "Pequenos negócios",
    text: "Venda por link e receba de qualquer cliente, presencial ou à distância.",
    img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80&auto=format&fit=crop",
  },
  {
    title: "Autônomos e serviços",
    text: "Do salão à assistência técnica: um link só para cobrar todo mundo.",
    img: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=800&q=80&auto=format&fit=crop",
  },
];

const RECEBER = [
  {
    title: "Valor fixo",
    text: "Defina o preço do seu produto ou serviço. O cliente só confirma e paga.",
  },
  {
    title: "Doação livre",
    text: "Deixe quem paga escolher o valor. Ideal para apoio e gorjetas.",
  },
  {
    title: "Consultoria",
    text: "Cobre sessões e horas com título e descrição personalizados.",
  },
];

const BENEFITS = [
  "Sem mensalidade e sem maquininha",
  "Recebimento via PIX, cai na hora",
  "Link personalizado com seu nome de usuário",
  "Painel com saldo, cobranças e saques",
  "Saque para sua chave PIX ou conta bancária",
  "Página de pagamento pronta e responsiva",
];

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
                Receba por PIX em segundos
              </span>
              <h1 className="mt-6 text-4xl leading-tight sm:text-5xl lg:text-6xl">
                Seu dinheiro na mão com{" "}
                <span className="text-gradient-neon">um único link</span>
              </h1>
              <p className="mt-5 max-w-md text-lg text-pixflow-slate/70">
                Crie seu link de pagamento, compartilhe com quem quiser e receba
                via PIX na hora. Sem maquininha, sem mensalidade, sem burocracia.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg" fullWidth>
                    Criar meu link grátis
                  </Button>
                </Link>
                <a href="#como-funciona">
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
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80&auto=format&fit=crop"
                  alt="Pessoa recebendo pagamento pelo celular"
                  width={900}
                  height={1000}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* MENU HORIZONTAL (4 usos) */}
        <section className="border-y border-white/10 bg-pixflow-darker/50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 text-sm text-pixflow-slate/60 sm:px-6">
            <span className="font-medium text-pixflow-slate">Feito para:</span>
            <span className="hover:text-pixflow-cyan">Criadores</span>
            <span className="hover:text-pixflow-cyan">Freelancers</span>
            <span className="hover:text-pixflow-cyan">Pequenos negócios</span>
            <span className="hover:text-pixflow-cyan">Autônomos</span>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl">Como funciona</h2>
            <p className="mt-3 text-pixflow-slate/60">
              Do link ao dinheiro na conta em três passos.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="group rounded-2xl border border-white/10 bg-pixflow-darker/50 p-7 transition-colors hover:border-pixflow-cyan/40"
              >
                <span className="font-display text-4xl text-gradient-neon">{s.n}</span>
                <h3 className="mt-4 text-xl">{s.title}</h3>
                <p className="mt-2 text-sm text-pixflow-slate/60">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* NICHOS 2x2 */}
        <section id="nichos" className="bg-pixflow-darker/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl sm:text-4xl">Para quem é o PixFlow</h2>
              <p className="mt-3 text-pixflow-slate/60">
                Se você recebe dinheiro de outras pessoas, o PixFlow é para você.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {NICHOS.map((n) => (
                <div
                  key={n.title}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-pixflow-dark transition-transform hover:-translate-y-1"
                >
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={n.img}
                      alt={n.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-pixflow-dark via-pixflow-dark/20 to-transparent" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl">{n.title}</h3>
                    <p className="mt-2 text-sm text-pixflow-slate/60">{n.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3 FORMAS DE RECEBER */}
        <section id="receber" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl">Três formas de receber</h2>
            <p className="mt-3 text-pixflow-slate/60">
              Escolha o tipo de link que faz sentido para você.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {RECEBER.map((r, i) => (
              <div
                key={r.title}
                className="rounded-2xl border-l-2 border-l-pixflow-cyan border-y border-r border-white/10 bg-pixflow-darker/50 p-7"
              >
                <span className="text-xs font-medium text-pixflow-cyan">
                  Opção {i + 1}
                </span>
                <h3 className="mt-2 text-xl">{r.title}</h3>
                <p className="mt-2 text-sm text-pixflow-slate/60">{r.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* VANTAGENS */}
        <section id="vantagens" className="bg-pixflow-darker/40 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl sm:text-4xl">
                Tudo que você precisa para{" "}
                <span className="text-gradient-neon">receber melhor</span>
              </h2>
              <p className="mt-4 text-pixflow-slate/60">
                Um painel completo para acompanhar cada pagamento e sacar quando
                quiser.
              </p>
            </div>
            <ul className="grid gap-3">
              {BENEFITS.map((b) => (
                <li
                  key={b}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-pixflow-dark px-4 py-3"
                >
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-pixflow-cyan/15 font-display text-sm text-pixflow-cyan">
                    ✓
                  </span>
                  <span className="text-sm text-pixflow-slate/80">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="relative overflow-hidden py-24">
          <div className="pointer-events-none absolute inset-0 bg-neon-gradient opacity-70" />
          <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h2 className="text-3xl sm:text-4xl">
              Comece a receber ainda hoje
            </h2>
            <p className="mt-4 text-pixflow-slate/70">
              Crie sua conta grátis e tenha seu link de pagamento em minutos.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/signup">
                <Button size="lg">Criar meu link grátis</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
