import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Database, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import logoSrc from '@/assets/logo.png';

const sections = [
  {
    title: '1. Dados que coletamos',
    icon: UserRound,
    body: [
      'Coletamos os dados necessários para criar e manter sua conta, como nome, e-mail, identificador de usuário e informações de perfil informadas dentro do app.',
      'Também armazenamos informações criadas pelo uso do Passe de Batalha, como missões, hábitos, agenda, treinos, progresso, recompensas, preferências e configurações.',
      'Quando aplicável, podemos manter dados de status de assinatura para liberar ou bloquear o acesso ao app. Dados completos de pagamento, como número de cartão, não são armazenados pelo Passe de Batalha.',
    ],
  },
  {
    title: '2. Como usamos seus dados',
    icon: Database,
    body: [
      'Usamos seus dados para autenticar sua conta, salvar seu progresso, exibir suas missões, organizar sua agenda, calcular evolução e manter as funcionalidades do app funcionando corretamente.',
      'Também usamos informações técnicas para corrigir erros, melhorar a estabilidade e proteger a plataforma contra acessos indevidos.',
    ],
  },
  {
    title: '3. Integração com Google Agenda',
    icon: CalendarDays,
    body: [
      'Se você conectar sua conta Google, o Passe de Batalha poderá acessar eventos do Google Agenda conforme as permissões autorizadas por você.',
      'A integração é usada para listar eventos, exibir compromissos dentro do app e criar eventos no seu calendário quando você solicitar a sincronização.',
      'Não usamos dados do Google Agenda para publicidade, venda de dados ou compartilhamento com terceiros sem sua autorização.',
      'Você pode desconectar o Google Agenda nas configurações do app ou revogar o acesso diretamente na sua Conta Google.',
    ],
  },
  {
    title: '4. Compartilhamento de dados',
    icon: ShieldCheck,
    body: [
      'Não vendemos seus dados pessoais.',
      'Podemos compartilhar dados apenas com fornecedores necessários para operar o app, como autenticação, banco de dados, hospedagem, suporte, processamento de assinatura e integrações autorizadas por você.',
      'Esses fornecedores devem tratar os dados apenas para prestar os serviços contratados e de acordo com regras de segurança e privacidade aplicáveis.',
    ],
  },
  {
    title: '5. Segurança e armazenamento',
    icon: LockKeyhole,
    body: [
      'Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda, alteração ou uso indevido.',
      'Mesmo com esses cuidados, nenhum sistema é completamente imune a falhas. Por isso, recomendamos que você mantenha sua senha protegida e não compartilhe sua conta.',
    ],
  },
  {
    title: '6. Seus direitos',
    icon: Mail,
    body: [
      'Você pode solicitar acesso, correção ou exclusão dos seus dados pessoais, quando aplicável.',
      'Também pode solicitar informações sobre o tratamento dos seus dados ou pedir a revogação de consentimentos concedidos.',
      'Para exercer esses direitos, entre em contato pelo e-mail suporte@gabrielconde.com.br.',
    ],
  },
];

export default function Privacy() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8 sm:py-10">
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
            Política de Privacidade
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Esta política explica, de forma simples, como o Passe de Batalha coleta, usa, armazena e protege dados dos usuários.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
            Última atualização: 21 de setembro de 2026
          </p>
        </section>

        <section className="space-y-4 pb-12">
          {sections.map((section) => (
            <article key={section.title} className="border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <section.icon className="h-5 w-5 text-amber-300" />
                <h2 className="font-display text-base uppercase tracking-[0.14em] text-white">
                  {section.title}
                </h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="border border-amber-400/20 bg-[#0b0b0b] p-5 sm:p-6">
          <h2 className="font-display text-base uppercase tracking-[0.14em] text-white">
            Contato
          </h2>
          <div className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
            <p>
              Em caso de dúvidas, solicitações relacionadas aos seus dados pessoais ou exercício de direitos previstos na LGPD, entre em contato conosco:
            </p>
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
          <Link to="/terms" className="hover:text-amber-200">
            Termos de Uso
          </Link>
        </footer>
      </div>
    </main>
  );
}
