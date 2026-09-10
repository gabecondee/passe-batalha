import { useId, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CharacterCard } from '@/components/dashboard/CharacterCard';
import { AttributeRadar } from '@/components/dashboard/AttributeRadar';
import { useGame } from '@/contexts/GameContext';
import { Calendar, Target, Star, Camera, Cake, Scale, Ruler, User as UserIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { compressProfileImage } from '@/lib/profileImage';
import { cn } from '@/lib/utils';

export default function Profile() {
  const { user, updateAvatar, attributes, missions, skills } = useGame();
  const fileInputId = useId();
  const [compressing, setCompressing] = useState(false);

  const completedMissions = missions.filter(m => m.status === 'completed').length;
  const unlockedSkills = skills.filter(s => s.unlocked).length;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB.');
      return;
    }

    setCompressing(true);
    try {
      const compressed = await compressProfileImage(file);
      updateAvatar(compressed);
    } catch {
      toast.error('Erro ao processar a imagem. Tente outra.');
    } finally {
      setCompressing(false);
    }
  };

  function calculateAge(birthDateStr?: string) {
    if (!birthDateStr) return null;
    const cleanDate = birthDateStr.slice(0, 10);
    const today = new Date();
    const birth = new Date(cleanDate + 'T00:00:00');
    if (isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  }

  const age = calculateAge(user.birthDate);

  const stats = [
    { icon: Target, label: 'Missões Concluídas', value: completedMissions },
    { icon: Star, label: 'Habilidades Desbloqueadas', value: unlockedSkills },
    { icon: Calendar, label: 'Dias de Streak', value: 0 },
  ];

  const genderLabel = user.gender === 'male' ? 'Masculino' : user.gender === 'female' ? 'Feminino' : user.gender === 'other' ? 'Outro' : '-';

  const bioStats = [
    { icon: UserIcon, label: 'Sexo', value: genderLabel },
    { icon: Cake, label: 'Idade', value: age !== null ? `${age} anos` : '-' },
    { icon: Scale, label: 'Peso', value: user.weight ? `${user.weight} kg` : '-' },
    { icon: Ruler, label: 'Altura', value: user.height ? `${user.height} cm` : '-' },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div data-tour-id="tour-profile-header">
          <h1 className="font-display text-3xl md:text-4xl mb-2">
            <span className="text-gradient-gold">Perfil do Personagem</span>
          </h1>
          <p className="text-muted-foreground">
            Visualize sua evolução completa
          </p>
        </div>

        {/* Character Card with Upload */}
        <div className="relative">
          <CharacterCard user={user} />
          <label
            htmlFor={fileInputId}
            aria-disabled={compressing}
            className={cn(
              'absolute bottom-2 right-2 z-20 flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/20 px-3 py-1.5 font-display text-xs text-primary backdrop-blur-sm transition-colors hover:bg-primary/30 md:bottom-4 md:right-4 md:gap-2 md:px-4 md:py-2 md:text-sm',
              compressing && 'pointer-events-none cursor-not-allowed opacity-60',
            )}
          >
            {compressing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {compressing ? 'Comprimindo...' : 'Alterar Foto'}
          </label>
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="sr-only"
            disabled={compressing}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-tour-id="tour-profile-stats">
          {stats.map((stat, index) => (
            <div key={index} className="fantasy-card p-4 text-center">
              <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-display">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Physical Bio Grid: Sexo, Idade, Peso, Altura */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {bioStats.map((stat, index) => (
            <div key={index} className="fantasy-card p-4 text-center">
              <stat.icon className="w-5 h-5 mx-auto mb-1.5 text-amber-400" />
              <p className="text-base md:text-lg font-display text-primary">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Attributes Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          <AttributeRadar attributes={attributes} />

          <div className="fantasy-card p-6">
            <h3 className="font-display text-lg mb-4">Detalhes dos Atributos</h3>
            <div className="space-y-4">
              {attributes.map((attr) => {
                const progress = ((attr.xp % 500) / 500) * 100;
                return (
                  <div key={attr.type}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{attr.icon}</span>
                        <span className="font-medium">{attr.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Nível {attr.level}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${progress}%`,
                          backgroundColor: `hsl(var(--${attr.type}))`
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {attr.xp.toLocaleString()} XP total
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
