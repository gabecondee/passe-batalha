import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';

import { AreaMissionsView } from '@/components/missions/AreaMissionsView';
import { useGame } from '@/contexts/GameContext';
import { AttributeType } from '@/types/game';
import {
  Crosshair,

  TrendingUp,
  Network,
  Lightbulb,
  Skull,
  Mountain,
  Star,
  Leaf,
  Gem,
  ChevronRight,
  Dumbbell,
  Brain,
  Sparkles,
  Briefcase,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AREAS: AttributeType[] = ['physical', 'mental', 'spiritual', 'professional', 'financial'];

const AREA_CONFIG: Record<AttributeType, { label: string; icon: typeof Dumbbell; color: string; bg: string; border: string }> = {
  physical:     { label: 'FÍSICA',       icon: Dumbbell,  color: 'text-sky-400',      bg: 'bg-sky-400/10',      border: 'border-sky-400/30' },
  mental:       { label: 'MENTAL',       icon: Brain,     color: 'text-violet-400',   bg: 'bg-violet-400/10',   border: 'border-violet-400/30' },
  spiritual:    { label: 'ESPIRITUAL',   icon: Sparkles,  color: 'text-amber-300',    bg: 'bg-amber-300/10',    border: 'border-amber-300/30' },
  professional: { label: 'PROFISSIONAL', icon: Briefcase, color: 'text-emerald-400',  bg: 'bg-emerald-400/10',  border: 'border-emerald-400/30' },
  financial:    { label: 'FINANCEIRA',   icon: Coins,     color: 'text-orange-400',   bg: 'bg-orange-400/10',   border: 'border-orange-400/30' },
};

type Diff = {
  level: number;
  label: string;
  description: string;
  limit: number | null;
  icon: typeof Skull;
  color: string;
  glow: string;
  border: string;
};

const DIFFICULTIES: Diff[] = [
  { level: 5, label: 'INSANA',      description: 'Confrontam diretamente seus hábitos atuais',     limit: 1,    icon: Skull,    color: 'text-red-500',     glow: 'shadow-[0_0_24px_-6px_hsl(0_85%_55%/0.6)]',     border: 'border-red-500/40' },
  { level: 4, label: 'DIFÍCIL',     description: 'Oferecem bastante resistência mental',           limit: 2,    icon: Mountain, color: 'text-orange-500',  glow: 'shadow-[0_0_24px_-6px_hsl(25_95%_55%/0.55)]',   border: 'border-orange-500/40' },
  { level: 3, label: 'MÉDIA',       description: 'Necessitam de mais esforço conscientemente',     limit: 4,    icon: Star,     color: 'text-yellow-400',  glow: 'shadow-[0_0_24px_-6px_hsl(48_95%_55%/0.55)]',   border: 'border-yellow-400/40' },
  { level: 2, label: 'FÁCIL',       description: 'Exigem pouco esforço mental do jogador',         limit: 6,    icon: Leaf,     color: 'text-emerald-400', glow: 'shadow-[0_0_24px_-6px_hsl(152_70%_45%/0.5)]',   border: 'border-emerald-400/40' },
  { level: 1, label: 'MUITO FÁCIL', description: 'Tarefas mais simples que são feitas sem nenhum esforço', limit: null, icon: Gem, color: 'text-cyan-400', glow: 'shadow-[0_0_24px_-6px_hsl(190_95%_55%/0.5)]', border: 'border-cyan-400/40' },
];

function Hexagon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('relative w-16 h-16 flex items-center justify-center', className)}
      style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
    >
      {children}
    </div>
  );
}

export default function Missions() {
  const [selectedArea, setSelectedArea] = useState<AttributeType | null>(null);

  const { missions, createMission, startMission, completeMission, updateProgress, deleteMission } = useGame();

  const activeByDifficulty = useMemo(() => {
    const map: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    missions.forEach(m => {
      if (m.status !== 'completed') map[m.difficulty] = (map[m.difficulty] || 0) + 1;
    });
    return map;
  }, [missions]);

  const activeByArea = useMemo(() => {
    const map: Record<string, number> = {};
    missions.forEach(m => {
      if (m.status !== 'completed') map[m.attribute] = (map[m.attribute] || 0) + 1;
    });
    return map;
  }, [missions]);

  if (selectedArea) {
    return (
      <MainLayout>
        <AreaMissionsView
          attribute={selectedArea}
          missions={missions}
          onBack={() => setSelectedArea(null)}
          onCreate={createMission}
          onStart={startMission}
          onComplete={completeMission}
          onUpdateProgress={updateProgress}
          onDelete={deleteMission}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        {/* Title */}
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-3">
            <Crosshair
              className="w-7 h-7"
              style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.55))' }}
            />
            <h1
              className="font-display text-3xl md:text-4xl tracking-[0.18em] font-bold"
              style={{
                background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MISSÕES
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 px-6">
            Crie e complete missões para ganhar XP e evoluir sua árvore de habilidades.
          </p>
        </div>


        {/* QUADRO DE MISSÕES */}
        <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-5 md:p-6 space-y-4">
          <header className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-orange-400 mt-1" />
            <div>
              <h2 className="font-display text-lg md:text-xl tracking-wider">QUADRO DE MISSÕES</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Crie suas missões com sabedoria, pois a quantidade<br className="hidden sm:block" /> é limitada pela dificuldade escolhida.
              </p>
            </div>
          </header>

          <div className="space-y-3">
            {DIFFICULTIES.map(d => {
              const Icon = d.icon;
              const used = activeByDifficulty[d.level] ?? 0;
              return (
                <div
                  key={d.level}
                  className={cn(
                    'rounded-xl border bg-background/40 p-3 flex items-center gap-3',
                    d.border,
                    d.glow,
                  )}
                >
                  <Hexagon className={cn('shrink-0', d.color)}>
                    <div className={cn('absolute inset-0 bg-current opacity-10')} />
                    <div className={cn('absolute inset-[2px]')} style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: 'hsl(var(--background))' }} />
                    <Icon className={cn('w-7 h-7 relative', d.color)} strokeWidth={2} />
                  </Hexagon>

                  <div className="flex-1 min-w-0">
                    <div className={cn('font-display tracking-wider text-base', d.color)}>{d.label}</div>
                    <div className="text-xs text-muted-foreground leading-snug mt-0.5">{d.description}</div>
                  </div>

                  <div className="shrink-0 pl-3 border-l border-border/60 text-right">
                    <div className="font-display text-xl">
                      <span className="text-foreground">{used}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className={d.color}>{d.limit === null ? '∞' : d.limit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ÁREAS DE DESENVOLVIMENTO */}
        <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-5 md:p-6 space-y-4">
          <header className="flex items-center gap-3">
            <Network className="w-6 h-6 text-orange-400" />
            <h2 className="font-display text-lg md:text-xl tracking-wider">ÁREAS DE DESENVOLVIMENTO</h2>
          </header>

          <div className="space-y-3">
            {AREAS.map(area => {
              const cfg = AREA_CONFIG[area];
              const Icon = cfg.icon;
              const count = activeByArea[area] ?? 0;
              return (
                <button
                  key={area}
                  onClick={() => setSelectedArea(area)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border bg-background/30 hover:bg-background/50 transition-all text-left',
                    'border-border/60 hover:border-primary/40',
                  )}
                >
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center border', cfg.bg, cfg.border)}>
                    <Icon className={cn('w-6 h-6', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-display tracking-wider text-sm', cfg.color)}>{cfg.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Missões em andamento: <span className="text-orange-400 font-semibold">{count}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>

          {/* DICA */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-background/30">
            <div className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-xs md:text-sm leading-snug pt-1">
              <span className="text-orange-400 font-semibold">DICA: </span>
              <span className="text-muted-foreground">As missões são o combustível que impulsiona sua evolução em todas as áreas.</span>
            </p>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
