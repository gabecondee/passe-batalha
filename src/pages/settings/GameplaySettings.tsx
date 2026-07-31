import { useEffect, useState } from 'react';
import { Gamepad2, Zap } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { useGame } from '@/contexts/GameContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CLASSES = [
  { id: 'warrior', label: 'Guerreiro', icon: '⚔️' },
  { id: 'monk', label: 'Monge', icon: '🧘' },
  { id: 'mage', label: 'Mago', icon: '🔮' },
  { id: 'assassin', label: 'Assassino', icon: '🗡️' },
  { id: 'paladin', label: 'Paladino', icon: '🛡️' },
  { id: 'archer', label: 'Arqueiro', icon: '🏹' },
  { id: 'samurai', label: 'Samurai', icon: '🎌' },
];

const AREAS = [
  { id: 'physical', label: 'Saúde / Físico', icon: '💪' },
  { id: 'mental', label: 'Estudos / Mental', icon: '🧠' },
  { id: 'financial', label: 'Financeiro', icon: '💰' },
  { id: 'professional', label: 'Trabalho', icon: '💼' },
  { id: 'spiritual', label: 'Espiritual', icon: '✨' },
  { id: 'social', label: 'Social', icon: '🤝' },
];

export default function GameplaySettings() {
  const { user, setEnergy } = useGame();
  const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('user_class') || 'warrior');
  const [selectedArea, setSelectedArea] = useState(() => localStorage.getItem('user_main_area') || 'physical');
  const [energy, setEnergyLocal] = useState(user.energy ?? 70);

  useEffect(() => { localStorage.setItem('user_class', selectedClass); }, [selectedClass]);
  useEffect(() => { localStorage.setItem('user_main_area', selectedArea); }, [selectedArea]);

  const applyEnergy = () => {
    setEnergy(energy);
    toast.success(`Energia ajustada para ${energy}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        <SettingsHeader icon={Gamepad2} title="Gameplay" backTo="/settings" />

        <section className="fantasy-card p-5 md:p-6 space-y-3">
          <h3 className="font-display uppercase tracking-wider text-sm text-primary">Classe Principal</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CLASSES.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedClass(c.id); toast.success(`Classe: ${c.label}`); }}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                  selectedClass === c.id
                    ? 'border-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.35)]'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span className="text-2xl">{c.icon}</span>
                <span className="text-xs font-display tracking-wider">{c.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="fantasy-card p-5 md:p-6 space-y-3">
          <h3 className="font-display uppercase tracking-wider text-sm text-primary">Área Principal de Evolução</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AREAS.map(a => (
              <button
                key={a.id}
                onClick={() => { setSelectedArea(a.id); toast.success(`Área: ${a.label}`); }}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border transition-all',
                  selectedArea === a.id
                    ? 'border-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.35)]'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span className="text-xl">{a.icon}</span>
                <span className="text-xs md:text-sm font-display tracking-wider">{a.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="fantasy-card p-5 md:p-6 space-y-4">
          <h3 className="font-display uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <Zap className="w-4 h-4" /> Energia diária
          </h3>
          <p className="text-xs text-muted-foreground">Reajuste manualmente seu nível de energia atual.</p>
          <div className="flex items-center gap-4">
            <input
              type="range" min={0} max={100} value={energy}
              onChange={e => setEnergyLocal(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="font-display text-primary w-10 text-right">{energy}</span>
          </div>
          <button onClick={applyEnergy} className="w-full md:w-auto px-4 py-2 rounded-lg border border-primary/50 text-primary font-display text-sm tracking-wider hover:bg-primary/10 transition-colors">
            Aplicar
          </button>
        </section>
      </div>
    </MainLayout>
  );
}
