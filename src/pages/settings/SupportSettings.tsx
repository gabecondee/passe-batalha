import { HelpCircle, MessageCircle, Bug, Lightbulb, FileText, Scale, Info, Mail } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsCard } from '@/components/settings/SettingsCard';

const APP_VERSION = '1.0.0';

export default function SupportSettings() {
  const mail = (subject: string) => `mailto:suporte@passedebatalha.app?subject=${encodeURIComponent(subject)}`;
  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        <SettingsHeader icon={HelpCircle} title="Suporte" backTo="/settings" />

        <div className="space-y-3">
          <SettingsCard icon={HelpCircle} title="FAQ" description="Perguntas frequentes" onClick={() => window.open('https://gabrielconde.com.br/passe-de-batalha', '_blank')} />
          <SettingsCard icon={MessageCircle} title="Central de ajuda" description="Fale com a comunidade" onClick={() => window.open('https://gabrielconde.com.br/passe-de-batalha', '_blank')} />
          <SettingsCard icon={Mail} title="Enviar feedback" description="Compartilhe sua experiência" onClick={() => (window.location.href = mail('Feedback — Passe de Batalha'))} />
          <SettingsCard icon={Bug} title="Reportar bug" description="Encontrou algo errado?" onClick={() => (window.location.href = mail('Bug report — Passe de Batalha'))} />
          <SettingsCard icon={Lightbulb} title="Sugestões" description="Sugira novas funcionalidades" onClick={() => (window.location.href = mail('Sugestão — Passe de Batalha'))} />
          <SettingsCard icon={Scale} title="Política de privacidade" description="Como tratamos seus dados" onClick={() => window.open('https://gabrielconde.com.br/politica-privacidade', '_blank')} />
          <SettingsCard icon={FileText} title="Termos de uso" description="Regras da plataforma" onClick={() => window.open('https://gabrielconde.com.br/termos-de-uso', '_blank')} />
        </div>

        <div className="fantasy-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-primary" />
            <div>
              <p className="font-display uppercase tracking-wider text-sm">Versão</p>
              <p className="text-xs text-muted-foreground">Passe de Batalha</p>
            </div>
          </div>
          <span className="font-display text-primary">{APP_VERSION}</span>
        </div>
      </div>
    </MainLayout>
  );
}
