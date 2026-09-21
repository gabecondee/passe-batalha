import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import logoSrc from '@/assets/logo.png';

const terms = [
  'O Passe de Batalha é um aplicativo de organização pessoal e produtividade gamificada.',
  'Você é responsável por manter seus dados de acesso em segurança e por usar o app de forma lícita.',
  'As informações registradas no app devem ser usadas para fins pessoais de organização, acompanhamento e evolução.',
  'Funcionalidades externas, como Google Agenda, dependem da autorização do usuário e das regras dos respectivos serviços.',
  'Podemos atualizar funcionalidades, corrigir problemas ou alterar estes termos quando necessário.',
];

export default function Terms() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3" aria-label="Passe de Batalha">
            <img src={logoSrc} alt="Passe de Batalha" className="h-11 w-11 rounded-full object-contain" />
            <span className="font-display text-sm uppercase tracking-[0.2em] text-amber-300">
              Passe de Batalha
            </span>
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-amber-300/60 bg-amber-400 px-4 py-2.5 text-sm font-black uppercase tracking-[0.14em] text-[#1a1208] transition hover:bg-amber-300"
          >
            Entrar
          </Link>
        </header>

        <section className="py-12 text-center sm:py-16">
          <Link
            to="/"
            className="mx-auto mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-amber-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a página inicial
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
            Documento público
          </p>
          <h1 className="mt-4 font-display text-3xl leading-tight text-white sm:text-5xl">
            Termos de Uso
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Estes termos resumem as regras básicas para uso do Passe de Batalha.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
            Última atualização: 21 de setembro de 2026
          </p>
        </section>

        <section className="space-y-3 pb-12">
          {terms.map((term) => (
            <div key={term} className="flex items-start gap-3 border border-white/10 bg-white/[0.035] p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <p className="text-sm leading-7 text-slate-300">{term}</p>
            </div>
          ))}
        </section>

        <section className="border border-amber-400/20 bg-[#0b0b0b] p-5 sm:p-6">
          <h2 className="font-display text-base uppercase tracking-[0.14em] text-white">
            Contato
          </h2>
          <div className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
            <p><strong className="text-slate-100">Empresa:</strong> 52.972.291 Gabriel Conde Matheus</p>
            <p><strong className="text-slate-100">CNPJ:</strong> 52.972.291/0001-83</p>
            <p>
              <strong className="text-slate-100">E-mail:</strong>{' '}
              <a href="mailto:suporte@gabrielconde.com.br" className="text-amber-300 hover:text-amber-200">
                suporte@gabrielconde.com.br
              </a>
            </p>
            <p><strong className="text-slate-100">Cidade:</strong> Santo Antônio da Platina - PR</p>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-8 text-center text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>© Passe de Batalha. Todos os direitos reservados.</span>
          <Link to="/privacy" className="hover:text-amber-200">
            Política de Privacidade
          </Link>
        </footer>
      </div>
    </main>
  );
}
