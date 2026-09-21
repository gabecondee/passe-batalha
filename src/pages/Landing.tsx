import { Link } from 'react-router-dom';
import {
  Backpack,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Dumbbell,
  Medal,
  NotebookText,
  LineChart,
  Salad,
  ShieldCheck,
  Skull,
  Sparkles,
  Target,
  TreeDeciduous,
  Trophy,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import logoSrc from '@/assets/logo.png';

const features = [
  {
    title: 'Missões',
    text: 'Transforme metas e tarefas em objetivos claros para cumprir no dia a dia.',
    icon: Target,
  },
  {
    title: 'Skills',
    text: 'Acompanhe sua evolução em áreas como físico, mental, espiritual, profissional e financeiro.',
    icon: TreeDeciduous,
  },
  {
    title: 'Chefões',
    text: 'Encare desafios, vícios e bloqueios como batalhas de evolução pessoal.',
    icon: Skull,
  },
  {
    title: 'Agenda',
    text: 'Organize compromissos e conecte eventos com o Google Agenda.',
    icon: CalendarDays,
  },
  {
    title: 'Treinos',
    text: 'Registre sua rotina física e acompanhe sua constância semanal.',
    icon: Dumbbell,
  },
  {
    title: 'Dieta',
    text: 'Planeje refeições e mantenha sua rotina alimentar alinhada aos seus objetivos.',
    icon: Salad,
  },
  {
    title: 'Finanças',
    text: 'Organize entradas, gastos e recursos para ter mais clareza sobre sua vida financeira.',
    icon: CircleDollarSign,
  },
  {
    title: 'Inventário',
    text: 'Guarde recompensas, itens e recursos conquistados na sua jornada.',
    icon: Backpack,
  },
  {
    title: 'Conquistas',
    text: 'Desbloqueie marcos importantes e veja o progresso da sua jornada ficando visível.',
    icon: Medal,
  },
  {
    title: 'Diário de Bordo',
    text: 'Registre reflexões, aprendizados e momentos importantes da sua caminhada.',
    icon: NotebookText,
  },
  {
    title: 'Progresso',
    text: 'Veja XP, níveis, ranking e evolução nas áreas importantes da vida.',
    icon: Trophy,
  },
];

export default function Landing() {
  const { user } = useAuth();
  const appHref = user ? '/app' : '/login';
  const ctaLabel = user ? 'Abrir app' : 'Entrar';

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="relative overflow-hidden px-5 pb-16 pt-6 sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.14),transparent_38%),linear-gradient(180deg,#050505_0%,#080808_100%)]" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="Passe de Batalha">
            <img
              src={logoSrc}
              alt="Passe de Batalha"
              className="h-12 w-12 rounded-full object-contain drop-shadow-[0_0_18px_rgba(245,158,11,0.35)]"
            />
            <span className="font-display text-sm uppercase tracking-[0.2em] text-amber-300">
              Passe de Batalha
            </span>
          </Link>

          <Link
            to={appHref}
            className="inline-flex items-center justify-center rounded-xl border border-amber-300/60 bg-amber-400 px-4 py-2.5 text-sm font-black uppercase tracking-[0.14em] text-[#1a1208] shadow-[0_0_24px_rgba(245,158,11,0.38)] transition hover:bg-amber-300"
          >
            {ctaLabel}
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[72svh] max-w-4xl flex-col items-center justify-center py-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
            <Sparkles className="h-4 w-4" />
            RPG aplicado à rotina real
          </div>

          <h1 className="mt-7 text-balance font-display text-[2.35rem] leading-[1.08] text-white sm:text-5xl lg:text-6xl">
            Transforme sua rotina em uma jornada de evolução.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            O Passe de Batalha reúne missões, chefões, agenda, skills, finanças, conquistas, treinos, dieta, inventário e diário de bordo em um único app gamificado.
          </p>

          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link
              to={appHref}
              className="inline-flex h-14 items-center justify-center rounded-xl border border-amber-300/70 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 px-9 text-base font-black uppercase tracking-[0.18em] text-[#1a1208] shadow-[0_0_36px_rgba(245,158,11,0.5)] transition hover:from-amber-200 hover:to-amber-400"
            >
              {ctaLabel}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="#funcoes"
              className="inline-flex h-14 items-center justify-center rounded-xl border border-white/12 bg-white/[0.035] px-7 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:border-amber-300/45 hover:text-amber-200"
            >
              Ver funções
            </a>
          </div>
        </div>
      </section>

      <section id="funcoes" className="border-y border-amber-400/10 bg-[#080808] px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
              Funções do app
            </p>
            <h2 className="mt-3 font-display text-2xl leading-tight text-white sm:text-4xl">
              O que você encontra dentro do Passe de Batalha.
            </h2>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="border border-white/10 bg-white/[0.035] p-5">
                <feature.icon className="mb-4 h-6 w-6 text-amber-300" />
                <h3 className="font-display text-base uppercase tracking-[0.15em] text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          <InfoCard
            icon={LineChart}
            title="Progresso visível"
            text="Acompanhe o que foi feito, onde você está evoluindo e o que ainda precisa de atenção."
          />
          <InfoCard
            icon={ShieldCheck}
            title="Acesso protegido"
            text="Seus dados e sua jornada ficam dentro do app, acessíveis apenas depois do login."
          />
        </div>
      </section>

      <section className="bg-[#080808] px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl leading-tight text-white sm:text-4xl">
            Continue sua jornada.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            Entre para acessar suas missões, chefões, agenda, skills, finanças, conquistas, treinos, dieta, inventário e diário de bordo.
          </p>
          <Link
            to={appHref}
            className="mt-8 inline-flex h-14 w-full max-w-sm items-center justify-center rounded-xl border border-amber-300/70 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 px-9 text-base font-black uppercase tracking-[0.18em] text-[#1a1208] shadow-[0_0_36px_rgba(245,158,11,0.46)] transition hover:from-amber-200 hover:to-amber-400"
          >
            {ctaLabel}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center text-sm text-slate-400 sm:flex-row sm:justify-between sm:text-left">
          <span>© Passe de Batalha. Todos os direitos reservados.</span>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-amber-200">
              Política de Privacidade
            </Link>
            <Link to="/terms" className="hover:text-amber-200">
              Termos de Uso
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof LineChart;
  title: string;
  text: string;
}) {
  return (
    <article className="border border-amber-400/15 bg-[#0b0b0b] p-5">
      <Icon className="mb-4 h-6 w-6 text-amber-300" />
      <h3 className="font-display text-sm uppercase tracking-[0.16em] text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
    </article>
  );
}
