import { Link2, Calendar, Wallet, Phone } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';

const INTEGRATIONS = [
  { icon: Calendar, name: 'Google Agenda', desc: 'Sincronize seus compromissos' },
  { icon: Wallet, name: 'Open Finance', desc: 'Conecte suas contas bancárias' },
  { icon: Phone, name: 'WhatsApp', desc: 'Lembretes e notificações' },
];

export default function IntegrationsSettings() {
  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        <SettingsHeader icon={Link2} title="Integrações" backTo="/settings" subtitle="Conecte suas ferramentas favoritas ao Passe de Batalha." />
        <div className="space-y-3">
          {INTEGRATIONS.map(i => (
            <div key={i.name} className="fantasy-card p-4 md:p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center shrink-0">
                <i.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display uppercase tracking-wider text-sm">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.desc}</p>
              </div>
              <span className="text-[10px] md:text-xs px-2 py-1 rounded-full border border-primary/40 text-primary font-display uppercase tracking-wider whitespace-nowrap">
                Em desenvolvimento
              </span>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
