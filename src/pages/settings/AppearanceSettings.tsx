import { Palette } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { ThemeSelector } from '@/components/theme/ThemeSelector';

export default function AppearanceSettings() {
  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        <SettingsHeader icon={Palette} title="Aparência" backTo="/settings" subtitle="Escolha o tema que combina com a sua jornada." />
        <ThemeSelector />
      </div>
    </MainLayout>
  );
}
