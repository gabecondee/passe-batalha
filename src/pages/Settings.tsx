import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { Settings, Paintbrush } from 'lucide-react';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl md:text-4xl mb-2">
            <span className="text-gradient-gold">Configurações</span>
          </h1>
          <p className="text-muted-foreground">
            Personalize sua experiência
          </p>
        </div>

        {/* Appearance */}
        <ThemeSelector />

        {/* Placeholder for future settings */}
        <div className="fantasy-card p-6">
          <h3 className="font-display text-lg mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Mais em breve
          </h3>
          <p className="text-sm text-muted-foreground">
            Notificações, privacidade e outras configurações serão adicionadas aqui.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
