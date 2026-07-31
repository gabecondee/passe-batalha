import { ArrowLeft, ScrollText, FileText, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsCard } from '@/components/settings/SettingsCard';

export default function LegalSettings() {
  const navigate = useNavigate();
  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        <button
          onClick={() => navigate('/settings')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <ScrollText
              className="w-10 h-10 text-primary flex-shrink-0"
              style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.55))' }}
            />
            <h1
              className="font-display text-[1.35rem] leading-tight tracking-[0.1em] font-bold text-primary"
              style={{ textShadow: '0 0 10px hsl(var(--primary) / 0.4)' }}
            >
              DOCUMENTOS LEGAIS
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 px-6">
            Consulte os documentos oficiais da plataforma.
          </p>
        </div>


        <div className="space-y-3">
          <SettingsCard
            icon={FileText}
            title="Termos de Uso"
            description="Regras e condições de uso da plataforma."
            onClick={() => window.open('https://gabrielconde.com.br/termos-de-uso', '_blank', 'noopener,noreferrer')}
          />
          <SettingsCard
            icon={Shield}
            title="Política de Privacidade"
            description="Como tratamos e protegemos seus dados."
            onClick={() => window.open('https://gabrielconde.com.br/politica-de-privacidade', '_blank', 'noopener,noreferrer')}
          />
        </div>
      </div>
    </MainLayout>
  );
}
