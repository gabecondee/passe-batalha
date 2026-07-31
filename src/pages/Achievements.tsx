import { useMemo, useState } from 'react';
import { useDragScroll } from '@/hooks/useDragScroll';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Lock, Star, X, Sparkles, Medal } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { useAchievementsData, type AchievementStatus } from '@/hooks/useAchievementsData';
import { RARITY_META, RARITY_ORDER, type Rarity } from '@/data/achievementsData';
import { cn } from '@/lib/utils';

const FILTERS: { id: 'all' | Rarity; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'comum', label: 'Comum' },
  { id: 'incomum', label: 'Incomum' },
  { id: 'rara', label: 'Rara' },
  { id: 'epica', label: 'Épica' },
  { id: 'lendaria', label: 'Lendária' },
  { id: 'mitica', label: 'Mítica' },
];

export default function Achievements() {
  const navigate = useNavigate();
  const { achievements, summary } = useAchievementsData();
  const [filter, setFilter] = useState<'all' | Rarity>('all');
  const [detail, setDetail] = useState<AchievementStatus | null>(null);
  const filterScrollRef = useDragScroll<HTMLDivElement>();


  const filtered = useMemo(() => {
    const list = filter === 'all' ? achievements : achievements.filter(a => a.rarity === filter);
    return [...list].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    });
  }, [achievements, filter]);

  return (
    <MainLayout>
      <PageTransition>
        <div className="min-h-screen p-4 pb-24 max-w-3xl mx-auto space-y-6">
          {/* Back */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-11 h-11 rounded-xl border border-border/60 bg-card/60 flex items-center justify-center hover:bg-card transition"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-muted-foreground">Voltar</span>
          </div>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <Medal className="w-8 h-8 text-primary" />
              <h1 className="font-display text-3xl md:text-4xl tracking-[0.2em] text-primary uppercase">
                Conquistas
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Complete desafios, evolua e desbloqueie conquistas para marcar sua jornada.
            </p>
          </div>

          {/* Summary Card */}
          <div className="fantasy-card border-l-4 border-l-amber-400 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Resumo
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <SummaryStat
                icon={<Trophy className="w-6 h-6 text-amber-400" />}
                value={summary.unlocked.toString()}
                label={'Conquistas\ndesbloqueadas'}
                ring="ring-amber-400/60"
                glow="shadow-[0_0_18px_rgba(245,158,11,0.4)]"
              />
              <SummaryStat
                icon={<Lock className="w-5 h-5 text-muted-foreground" />}
                value={summary.locked.toString()}
                label={'Conquistas\nbloqueadas'}
                ring="ring-border/60"
              />
              <SummaryStat
                icon={<Star className="w-5 h-5 text-muted-foreground" />}
                value={`${summary.percent}%`}
                label={'Progresso\ngeral'}
                ring="ring-border/60"
              />
            </div>
          </div>

          {/* Rarity Filter */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 px-1">
              Filtrar por raridade
            </h3>
            <div ref={filterScrollRef} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar select-none touch-pan-x">
              {FILTERS.map(f => {
                const isActive = filter === f.id;
                const meta = f.id !== 'all' ? RARITY_META[f.id] : null;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all',
                      isActive
                        ? meta
                          ? `${meta.bgClass} ${meta.textClass} border-current ${meta.glowClass}`
                          : 'bg-amber-500/15 text-amber-300 border-amber-400/60 shadow-[0_0_18px_rgba(245,158,11,0.4)]'
                        : 'bg-card/60 text-muted-foreground border-border/50 hover:border-border'
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Achievements list */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400">
                {filter === 'all' ? 'Todas as Conquistas' : RARITY_META[filter].label}
              </h3>
              <span className="text-[11px] text-muted-foreground">{filtered.length} itens</span>
            </div>
            {filtered.length === 0 ? (
              <div className="fantasy-card p-8 text-center text-sm text-muted-foreground">
                Nenhuma conquista nesta raridade.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3 sm:gap-4">
                {filtered.map(a => (
                  <AchievementBadge
                    key={a.id}
                    achievement={a}
                    onClick={() => a.unlocked && setDetail(a)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail popup for already-unlocked achievements */}
        <AnimatePresence>
          {detail && <DetailDialog achievement={detail} onClose={() => setDetail(null)} />}
        </AnimatePresence>
      </PageTransition>
    </MainLayout>
  );
}

function SummaryStat({
  icon, value, label, ring, glow,
}: { icon: React.ReactNode; value: string; label: string; ring: string; glow?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={cn(
        'w-14 h-14 rounded-full bg-background/60 flex items-center justify-center ring-2',
        ring, glow,
      )}>
        {icon}
      </div>
      <div className="font-display text-2xl text-foreground leading-none">{value}</div>
      <div className="text-[10px] text-muted-foreground whitespace-pre-line leading-tight">
        {label}
      </div>
    </div>
  );
}

function AchievementBadge({
  achievement,
  onClick,
}: {
  achievement: AchievementStatus;
  onClick: () => void;
}) {
  const meta = RARITY_META[achievement.rarity];
  const Icon = achievement.icon;
  const unlocked = achievement.unlocked;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!unlocked}
      className={cn(
        'flex flex-col items-center gap-1.5 transition-transform',
        unlocked && 'hover:scale-[1.03] active:scale-95 cursor-pointer',
        !unlocked && 'cursor-default',
      )}
    >
      <div className="relative">
        <div
          className={cn(
            'w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all',
            unlocked
              ? `${meta.bgClass} ring-2 ${meta.ringClass} ${meta.glowClass}`
              : 'bg-slate-800/60 ring-1 ring-slate-700 grayscale opacity-70'
          )}
          style={unlocked ? {
            background: `radial-gradient(circle at 50% 30%, ${meta.colorHex}33 0%, ${meta.colorHex}11 60%, transparent 100%)`,
          } : undefined}
        >
          {unlocked && (
            <div className="absolute inset-0 rounded-full pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 w-[2px] h-2 origin-bottom"
                  style={{
                    transform: `translate(-50%, -100%) rotate(${(i * 360) / 12}deg) translateY(-28px)`,
                    background: meta.colorHex,
                    opacity: 0.7,
                    boxShadow: `0 0 4px ${meta.colorHex}`,
                  }}
                />
              ))}
            </div>
          )}
          <Icon
            className={cn('w-7 h-7 sm:w-8 sm:h-8', unlocked ? '' : 'text-slate-500')}
            style={unlocked ? { color: meta.colorHex, filter: `drop-shadow(0 0 6px ${meta.colorHex})` } : undefined}
          />
        </div>
        {!unlocked && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
            <Lock className="w-3 h-3 text-slate-400" />
          </div>
        )}
      </div>
      <div className={cn(
        'text-[11px] leading-tight text-center font-medium max-w-[90px]',
        unlocked ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {achievement.name}
      </div>
      <div className="flex gap-[2px]" aria-label={`Raridade ${meta.label}`}>
        {Array.from({ length: meta.stars }).map((_, i) => (
          <Star
            key={i}
            className="w-2 h-2"
            style={{ color: meta.colorHex, fill: unlocked ? meta.colorHex : 'transparent' }}
          />
        ))}
      </div>
    </button>
  );
}

function DetailDialog({
  achievement,
  onClose,
}: {
  achievement: AchievementStatus;
  onClose: () => void;
}) {
  const meta = RARITY_META[achievement.rarity];
  const Icon = achievement.icon;
  const dateLabel = achievement.unlockedAt
    ? format(new Date(achievement.unlockedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'Data não registrada';
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 240 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative fantasy-card p-7 max-w-sm w-full text-center border-2',
          meta.glowClass,
        )}
        style={{ borderColor: meta.colorHex }}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
            Conquista Desbloqueada
          </span>
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>

        <div className="my-3 flex justify-center">
          <div
            className={cn('w-20 h-20 rounded-full flex items-center justify-center ring-2', meta.ringClass, meta.glowClass)}
            style={{
              background: `radial-gradient(circle at 50% 30%, ${meta.colorHex}44, ${meta.colorHex}11 70%, transparent)`,
            }}
          >
            <Icon className="w-9 h-9" style={{ color: meta.colorHex, filter: `drop-shadow(0 0 10px ${meta.colorHex})` }} />
          </div>
        </div>

        <h2 className="font-display text-xl mb-1" style={{ color: meta.colorHex }}>
          {achievement.name}
        </h2>
        <div className={cn('text-[11px] font-bold uppercase tracking-widest mb-2', meta.textClass)}>
          {meta.label}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-amber-400 mb-1">
          Marco Atingido
        </div>
        <p className="text-sm text-foreground mb-3">{achievement.milestone}</p>
        <p className="text-sm text-muted-foreground mb-4 italic">"{achievement.phrase}"</p>

        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
          Desbloqueada em <span className="text-foreground font-display">{dateLabel}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
