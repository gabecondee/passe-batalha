import { useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CharacterCard } from '@/components/dashboard/CharacterCard';
import { AttributeRadar } from '@/components/dashboard/AttributeRadar';
import { useGame } from '@/contexts/GameContext';
import { Calendar, Target, Star, Camera } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, updateAvatar, attributes, missions, skills } = useGame();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const completedMissions = missions.filter(m => m.status === 'completed').length;
  const unlockedSkills = skills.filter(s => s.unlocked).length;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    const url = URL.createObjectURL(file);
    updateAvatar(url);
  };

  const stats = [
    { icon: Target, label: 'Missões Concluídas', value: completedMissions },
    { icon: Star, label: 'Habilidades Desbloqueadas', value: unlockedSkills },
    { icon: Calendar, label: 'Dias de Streak', value: 0 },
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 right-2 md:bottom-4 md:right-4 z-20 flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs md:text-sm font-display hover:bg-primary/30 transition-colors backdrop-blur-sm"
          >
            <Camera className="w-4 h-4" />
            Alterar Foto
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
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
