import { useMemo, useState } from 'react';
import { useDragScroll } from '@/hooks/useDragScroll';
import { Mission, AttributeType } from '@/types/game';
import { CreateMissionDialog } from './CreateMissionDialog';
import { MissionSummaryDialog } from './MissionSummaryDialog';
import {
  ArrowLeft,
  Plus,
  Zap,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  BarChart3,
  Dumbbell,
  Brain,
  Sparkles,
  Briefcase,
  Coins,
  Trash2,
  Target,
  Skull,
  Mountain,
  Star,
  Leaf,
  Gem,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInCalendarDays, isPast, parseISO } from 'date-fns';

interface AreaMissionsViewProps {
  attribute: AttributeType;
  missions: Mission[];
  onBack: () => void;
  onCreate: (data: any) => void;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
}

const AREA_CONFIG: Record<AttributeType, {
  label: string;
  subtitle: string;
  icon: typeof Dumbbell;
  color: string; // tailwind color class
  ring: string;  // border color
  bg: string;
  hex: string;   // hex for shadows
}> = {
  physical:     { label: 'Área Física',       subtitle: 'Desafios que fortalecem seu corpo e aumentam sua energia.',          icon: Dumbbell,  color: 'text-blue-400',    ring: 'border-blue-400/50',   bg: 'bg-blue-400/10',    hex: '217 91% 60%' },
  mental:       { label: 'Área Mental',       subtitle: 'Desafios que aguçam sua mente e fortalecem seu foco.',               icon: Brain,     color: 'text-violet-400',  ring: 'border-violet-400/50', bg: 'bg-violet-400/10',  hex: '265 85% 65%' },
  spiritual:    { label: 'Área Espiritual',   subtitle: 'Desafios que elevam seu espírito e cultivam sua paz interior.',      icon: Sparkles,  color: 'text-amber-300',   ring: 'border-amber-300/50',  bg: 'bg-amber-300/10',   hex: '48 95% 60%' },
  professional: { label: 'Área Profissional', subtitle: 'Desafios que expandem sua carreira e fortalecem seu propósito.',     icon: Briefcase, color: 'text-emerald-400', ring: 'border-emerald-400/50',bg: 'bg-emerald-400/10', hex: '152 70% 50%' },
  financial:    { label: 'Área Financeira',   subtitle: 'Desafios que constroem sua liberdade e estabilidade financeira.',    icon: Coins,     color: 'text-orange-400',  ring: 'border-orange-400/50', bg: 'bg-orange-400/10',  hex: '25 95% 55%' },
};

const DIFFICULTY_LABELS: Record<number, { label: string; color: string; icon: typeof Skull }> = {
  1: { label: 'MUITO FÁCIL', color: 'text-cyan-400',    icon: Gem },
  2: { label: 'FÁCIL',       color: 'text-emerald-400', icon: Leaf },
  3: { label: 'MÉDIA',       color: 'text-yellow-400',  icon: Star },
  4: { label: 'DIFÍCIL',     color: 'text-orange-400',  icon: Mountain },
  5: { label: 'INSANA',      color: 'text-red-500',     icon: Skull },
};

type FilterKey = 'all' | 'active' | 'completed' | 'failed';
type MissionState = 'active' | 'completed' | 'failed';

function getMissionState(m: Mission): MissionState {
  if (m.status === 'completed') return 'completed';
  if (m.status === 'failed') return 'failed';
  if (m.deadline) {
    try {
      const d = parseISO(m.deadline);
      if (isPast(d) && differenceInCalendarDays(d, new Date()) < 0) return 'failed';
    } catch {}
  }
  return 'active';
}

function Hexagon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'active' | 'completed' | 'failed';
  difficultyColor?: string;
}) {
  return (
    <div className={cn('relative w-14 h-14 shrink-0 flex items-center justify-center', className)}>
      <div
        className="absolute inset-0 bg-border/40"
        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
      />
      <div
        className="absolute inset-[1.5px] bg-background"
        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}


function deadlineLabel(m: Mission, state: MissionState): string {
  if (!m.deadline) return state === 'completed' ? 'Concluída' : state === 'failed' ? 'Fracassada' : 'Sem prazo';
  try {
    const d = parseISO(m.deadline);
    if (state === 'completed') return `Concluída em ${format(d, 'dd/MM')}`;
    if (state === 'failed')    return `Fracassada em ${format(d, 'dd/MM')}`;
    const days = differenceInCalendarDays(d, new Date());
    if (days <= 0) return 'Expira hoje';
    if (days === 1) return 'Expira em 1 dia';
    return `Expira em ${days} dias`;
  } catch {
    return '';
  }
}

export function AreaMissionsView({
  attribute,
  missions,
  onBack,
  onCreate,
  onComplete,
  onDelete,
}: AreaMissionsViewProps) {
  const cfg = AREA_CONFIG[attribute];
  const AreaIcon = cfg.icon;
  const [filter, setFilter] = useState<FilterKey>('all');
  const filterScrollRef = useDragScroll<HTMLDivElement>();
  const [summaryMission, setSummaryMission] = useState<Mission | null>(null);

  // Show only main missions in the area list — daily actions are kept as a field inside each mission.
  const areaMissions = useMemo(
    () => missions.filter(m => m.attribute === attribute && (m.type === 'main' || !m.type)),
    [missions, attribute],
  );

  const counts = useMemo(() => {
    const c = { active: 0, completed: 0, failed: 0 };
    areaMissions.forEach(m => { c[getMissionState(m)]++; });
    return c;
  }, [areaMissions]);

  const filtered = useMemo(() => {
    if (filter === 'all') return areaMissions;
    return areaMissions.filter(m => getMissionState(m) === filter);
  }, [areaMissions, filter]);

  const FILTERS: { key: FilterKey; label: string; icon?: typeof CheckCircle2 }[] = [
    { key: 'all',       label: 'Todas' },
    { key: 'active',    label: 'Ativas',     icon: Zap },
    { key: 'completed', label: 'Concluídas', icon: CheckCircle2 },
    { key: 'failed',    label: 'Fracassadas',icon: XCircle },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      {/* Back button */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="shrink-0 w-10 h-10 rounded-xl border border-border/60 bg-card/60 backdrop-blur flex items-center justify-center hover:border-primary/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-muted-foreground">Voltar</span>
      </div>

      {/* Centered header: logo + title + description */}
      <div className="text-center mt-2">
        <div className="flex items-center justify-center gap-3">
          <AreaIcon
            className={cn('w-7 h-7', cfg.color)}
            style={{ filter: `drop-shadow(0 0 10px hsl(${cfg.hex} / 0.55))` }}
          />
          <h1
            className={cn('font-display text-2xl md:text-3xl tracking-[0.14em] font-bold uppercase', cfg.color)}
            style={{ textShadow: `0 0 14px hsl(${cfg.hex} / 0.35)` }}
          >
            {cfg.label}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-2 px-6">{cfg.subtitle}</p>
      </div>

      {/* Resumo */}
      <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-4">
        <div className="grid grid-cols-3 divide-x divide-border/60">
          <StatCol icon={Zap}          label="Missões ativas"      value={counts.active}    color="text-orange-400" />
          <StatCol icon={CheckCircle2} label="Missões concluídas"  value={counts.completed} color="text-emerald-400" />
          <StatCol icon={XCircle}      label="Missões fracassadas" value={counts.failed}    color="text-red-500" />
        </div>
      </section>

      {/* Criar nova missão — cor da área */}
      <CreateMissionDialog
        onCreate={onCreate}
        defaultAttribute={attribute}
        customTrigger={
          <button
            type="button"
            className={cn(
              'w-full rounded-xl border-2 border-dashed py-4 flex items-center justify-center gap-2 font-display tracking-wider transition-colors',
              cfg.color,
              cfg.ring,
              'hover:bg-current/10',
            )}
            style={{
              background: `hsl(${cfg.hex} / 0.05)`,
            }}
          >
            <Plus className="w-5 h-5" />
            CRIAR NOVA MISSÃO
          </button>
        }
      />

      {/* Filtros — cor da área, sem scrollbar */}
      <div
        ref={filterScrollRef}
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar select-none touch-pan-x"
      >
        <style>{`.filter-scroll::-webkit-scrollbar{display:none}`}</style>
        {FILTERS.map(f => {
          const Icon = f.icon;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-2 transition-all filter-scroll',
                active
                  ? cn(cfg.color, cfg.ring, 'shadow-[0_0_18px_-6px_currentColor]')
                  : 'border-border/60 text-muted-foreground hover:border-border'
              )}
              style={active ? { background: `hsl(${cfg.hex} / 0.10)` } : undefined}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card/30 p-10 text-center">
          <Target className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma missão {filter !== 'all' ? `“${FILTERS.find(f => f.key === filter)?.label.toLowerCase()}”` : ''} nesta área.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const state = getMissionState(m);
            const diff = DIFFICULTY_LABELS[m.difficulty] ?? DIFFICULTY_LABELS[1];
            const DiffIcon = diff.icon;
            const borderTone =
              state === 'completed' ? 'border-emerald-400/40' :
              state === 'failed'    ? 'border-red-500/40'     :
                                      cfg.ring;
            const statusBadge =
              state === 'completed'
                ? { label: 'CONCLUÍDA', cls: 'border-emerald-400/60 text-emerald-400' }
                : state === 'failed'
                ? { label: 'FRACASSADA', cls: 'border-red-500/60 text-red-500' }
                : { label: 'ATIVA', cls: cn(cfg.ring, cfg.color) };
            const xpClass =
              state === 'completed' ? 'text-emerald-400' :
              state === 'failed'    ? 'text-red-500'     :
                                      cfg.color;

            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => setSummaryMission(m)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSummaryMission(m); } }}
                className={cn(
                  'group rounded-2xl border bg-card/50 backdrop-blur p-3 md:p-4 flex items-start gap-3 transition-colors cursor-pointer focus:outline-none',
                  borderTone,
                )}
              >
                <Hexagon tone={state} difficultyColor={diff.color}>
                  {state === 'failed'
                    ? <XCircle className="w-6 h-6" />
                    : <DiffIcon className={cn('w-6 h-6', diff.color)} />}
                </Hexagon>

                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base md:text-lg leading-tight truncate">{m.name}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                    <span className={cn('inline-flex items-center gap-1 font-semibold', diff.color)}>
                      <BarChart3 className="w-3.5 h-3.5" />
                      {diff.label}
                    </span>
                    <span className="text-muted-foreground/50">|</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {deadlineLabel(m, state)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className={cn('px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider', statusBadge.cls)}>
                    {statusBadge.label}
                  </span>
                  <span className={cn('font-display text-sm md:text-base', xpClass)}>
                    +{m.xpReward}XP
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Excluir esta missão?')) onDelete(m.id);
                      }}
                      className="p-1 text-muted-foreground/60 hover:text-red-400"
                      aria-label="Excluir missão"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MissionSummaryDialog
        mission={summaryMission}
        open={!!summaryMission}
        onOpenChange={(o) => { if (!o) setSummaryMission(null); }}
      />
    </div>
  );
}

function StatCol({ icon: Icon, label, value, color }: { icon: typeof Zap; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-2">
      <Icon className={cn('w-6 h-6', color)} />
      <span className="text-[11px] md:text-xs text-muted-foreground text-center leading-tight">{label}</span>
      <span className={cn('font-display text-2xl md:text-3xl', color)}>{value}</span>
    </div>
  );
}
