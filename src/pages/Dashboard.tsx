import { useState, useMemo } from 'react';
import { EnergyCheckin } from '@/components/dashboard/EnergyCheckin';
import { MainLayout } from '@/components/layout/MainLayout';
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { SkillsRadar } from '@/components/dashboard/SkillsRadar';
import { useGame } from '@/contexts/GameContext';
import { useBoss } from '@/contexts/BossContext';
import { useAgenda } from '@/hooks/useAgenda';
import { WeekDay } from '@/types/game';
import { XP_PER_ACTION, toISODate } from '@/lib/missionRewards';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Flame, Star, Shield, Trophy, Swords, ChevronRight,
  Target, Calendar as CalendarIcon, Skull, Check, ShoppingCart, Gem, X, User, Dumbbell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStreakReward, addFragments } from '@/hooks/useStreakReward';
import { cn } from '@/lib/utils';


const CLASS_LABELS: Record<string, string> = {
  warrior: 'GUERREIRO', mage: 'MAGO', healer: 'CURANDEIRO',
  rogue: 'LADINO', paladin: 'PALADINO',
};

const ENERGY_MESSAGES: { max: number; description: string; activities: string[] }[] = [
  { max: 0, description: 'Morto', activities: ['RIP', 'Busque ajuda na comunidade'] },
  { max: 4, description: 'Fadiga excessiva, ansiedade e pensamentos negativos.', activities: ['Meditação por 15min controlando a respiração.', 'Escreva no diário.', 'Caminhada ao ar livre.', 'Evite contato social.'] },
  { max: 5, description: 'Fadiga, cérebro lento.', activities: ['Alimente-se bem, beba bastante água.', 'Faça uma caminhada ao ar livre.', 'Durma cedo e evite telas.'] },
  { max: 6, description: 'Falta de sono. Início da fadiga.', activities: ['Não exagere nem se cobre tanto.', 'Trabalhos menos cansativos.', 'Tarefas manuais ou domésticas.'] },
  { max: 7, description: 'Normal — Objetivo, energizado, tranquilo.', activities: ['Consegue se concentrar bem.', 'Tarefas cognitivas: estudar, ler, escrever.'] },
  { max: 9, description: 'Ativo e alerta.', activities: ['Capaz de realizar mais tarefas do que o habitual.', 'Aproveite a energia!'] },
  { max: 10, description: 'Cheio de energia. Tudo é possível!', activities: ['Capaz de realizar atividades físicas intensas ou longas horas de trabalho.'] },
];

function getEnergyInfo(level: number) {
  return ENERGY_MESSAGES.find((e) => level <= e.max) ?? ENERGY_MESSAGES[ENERGY_MESSAGES.length - 1];
}

function getEnergyGradient(level: number): string {
  if (level <= 3) return 'linear-gradient(90deg, hsl(0,75%,45%), hsl(15,80%,50%))';
  if (level <= 6) return 'linear-gradient(90deg, hsl(40,90%,50%), hsl(50,90%,55%))';
  return 'linear-gradient(90deg, hsl(140,70%,45%), hsl(120,65%,50%))';
}
function getEnergySolid(level: number): string {
  if (level <= 3) return 'hsl(0,75%,55%)';
  if (level <= 6) return 'hsl(45,90%,55%)';
  return 'hsl(140,70%,50%)';
}

export default function Dashboard() {
  const { user, missions, attributes, completeMission, completeDailyAction } = useGame();
  const { getActiveBattles, getTodayBossAction, recordDayAction, getProgress } = useBoss();
  const { state: streakRewardState } = useStreakReward();
  const { eventsByDate, toggleComplete } = useAgenda();
  const navigate = useNavigate();

  const [energyOpen, setEnergyOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [bossOpen, setBossOpen] = useState(false);




  const classLabel = user.userClass ? CLASS_LABELS[user.userClass] : 'AVENTUREIRO';

  const energyLevel = Math.round(user.energy / 10); // 0-10
  const maxEnergyLevel = Math.round(user.maxEnergy / 10) || 10;
  const energyInfo = getEnergyInfo(energyLevel);

  const xpProgress = user.xpToNextLevel > 0 ? (user.currentXP / user.xpToNextLevel) * 100 : 0;
  const ringRadius = 70;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - xpProgress / 100);

  const todayWeekDay = useMemo<WeekDay>(() => {
    const map: WeekDay[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    return map[new Date().getDay()];
  }, []);

  const todayISO = toISODate(new Date());
  const now = new Date();
  const allDailyMissions = missions.filter((m) => {
    if (!m.dailyAction || !m.weekDays || m.weekDays.length === 0) return false;
    if (m.status === 'completed' || m.status === 'failed') return false;
    if (!m.weekDays.includes(todayWeekDay)) return false;
    if (m.deadline) {
      const dl = new Date(m.deadline);
      dl.setHours(23, 59, 59, 999);
      if (now > dl) return false;
    }
    return true;
  });
  const dailyMissions = allDailyMissions.filter((m) => !(m.completedDates ?? []).includes(todayISO));

  const activeBattles = getActiveBattles();
  const currentStreak = streakRewardState.streak_days ?? 0;

  const todayEvents = eventsByDate(new Date());
  const pendingTodayEvents = todayEvents.filter((e) => !e.completed);

  return (
    <MainLayout>
      <EnergyCheckin />
      <div className="max-w-md mx-auto pb-8">
        {/* ===== TOP BAR: Fragments + Loja ===== */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex flex-col items-start gap-1.5">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card/60 backdrop-blur shadow-[0_0_15px_rgba(56,189,248,0.12)]"
            >
              <Gem className="w-4 h-4 text-sky-400" />
              <span className="font-display text-sm text-foreground tracking-wider">
                {streakRewardState.total_fragments.toLocaleString('pt-BR')}
              </span>
            </motion.div>

          </div>


          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/shop')}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border border-amber-400/60 bg-card/60 text-amber-400 hover:bg-amber-400/10 hover:scale-105 transition-all shadow-[0_0_18px_rgba(245,158,11,0.25)]"
            aria-label="Abrir loja"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[9px] font-display tracking-[0.2em] mt-0.5">LOJA</span>
          </motion.button>
        </div>


        {/* ===== AVATAR + XP RING + NAME + CLASS ===== */}
        <motion.div
          className="flex flex-col items-center -mt-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative" style={{ width: 180, height: 180 }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, hsl(195 100% 50% / 0.18) 0%, transparent 65%)',
                filter: 'blur(22px)',
              }}
            />
            <svg viewBox="0 0 180 180" className="absolute inset-0 w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="90" cy="90" r={ringRadius} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
              <motion.circle
                cx="90" cy="90" r={ringRadius} fill="none"
                stroke="#22d3ee" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={ringCircumference}
                initial={{ strokeDashoffset: ringCircumference }}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.75))' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-cyan-400/50 bg-card shadow-[0_0_25px_rgba(34,211,238,0.3)]">
                {(!user.avatar || user.avatar.includes('placeholder.svg')) ? (
                  <div className="w-full h-full bg-[#050b14] flex items-center justify-center">
                    <User className="w-14 h-14 text-cyan-500/50" />
                  </div>
                ) : (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center 12%', transform: 'scale(1.3)', transformOrigin: 'center 20%' }}
                  />
                )}
              </div>
            </div>
          </div>

          <h1 className="font-display text-2xl text-foreground mt-3 tracking-wide">
            {user.name.toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase())}
          </h1>
          <p className="text-xs tracking-[0.32em] text-muted-foreground mt-1">{classLabel}</p>
        </motion.div>

        {/* ===== STAT CARDS ===== */}
        <motion.div
          className="grid grid-cols-3 gap-2 mt-5"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        >
          <div className="rounded-xl border border-border bg-card/70 p-3 flex flex-col items-center justify-center text-center">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400/80" />
            <p className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase mt-1.5">XP Total</p>
            <p className="font-display text-base text-amber-400 leading-tight mt-0.5">
              {user.totalXP.toLocaleString('pt-BR')}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-400/40 bg-card/70 p-3 flex flex-col items-center justify-center text-center shadow-[0_0_18px_rgba(34,211,238,0.18)]">
            <Trophy className="w-6 h-6 text-cyan-400" />
            <p className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase mt-1.5">Nível</p>
            <p className="font-display text-base text-cyan-400 leading-tight mt-0.5" style={{ textShadow: '0 0 12px rgba(34,211,238,0.6)' }}>
              {user.level}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/70 p-3 flex flex-col items-center justify-center text-center">
            <Flame className="w-6 h-6 text-orange-400" />
            <p className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase mt-1.5">Ofensivas</p>
            <p className="font-display text-base text-orange-400 leading-tight mt-0.5">{currentStreak}</p>
          </div>
        </motion.div>

        {/* ===== ENERGY BAR (clickable) ===== */}
        <motion.div
          className="mt-3 rounded-xl border border-border bg-card/70 overflow-hidden"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        >
          <button onClick={() => setEnergyOpen((v) => !v)} className="w-full px-3 py-3 flex items-center gap-3 text-left">
            <Zap className="w-5 h-5 shrink-0" style={{ color: getEnergySolid(energyLevel) }} />
            <span className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase shrink-0">Energia</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: getEnergyGradient(energyLevel), boxShadow: `0 0 10px ${getEnergySolid(energyLevel)}80` }}
                initial={{ width: 0 }}
                animate={{ width: `${(energyLevel / maxEnergyLevel) * 100}%` }}
                transition={{ duration: 0.7 }}
              />
            </div>
            <span className="text-xs font-display tabular-nums shrink-0" style={{ color: getEnergySolid(energyLevel) }}>
              {energyLevel}/{maxEnergyLevel}
            </span>
          </button>
          <AnimatePresence initial={false}>
            {energyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-1 border-t border-border/50">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm text-foreground/90">{energyInfo.description}</p>
                    <button onClick={(e) => { e.stopPropagation(); setEnergyOpen(false); }} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2 font-display">Recomendações</p>
                  <ul className="space-y-1.5">
                    {energyInfo.activities.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: getEnergySolid(energyLevel) }} />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ===== SKILLS RADAR ===== */}
        <motion.button
          onClick={() => navigate('/skills')}
          className="w-full mt-3 rounded-2xl border border-cyan-400/30 bg-card/70 p-4 text-left hover:border-cyan-400/60 transition shadow-[0_0_25px_rgba(34,211,238,0.08)]"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-sm tracking-[0.22em] uppercase text-cyan-400 mx-auto">Árvore de Habilidades</h2>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <SkillsRadar attributes={attributes} />
        </motion.button>

        {/* ===== COMPROMISSOS ===== */}
        <CollapsibleCard
          icon={<CalendarIcon className="w-5 h-5 text-amber-400" />}
          iconBg="bg-amber-500/15 border-amber-500/40"
          title="Compromissos"
          subtitle="Veja seus compromissos do dia"
          countValue={pendingTodayEvents.length}
          countColor="text-amber-400"
          open={agendaOpen}
          onToggle={() => setAgendaOpen((v) => !v)}
          delay={0.3}
        >
          {todayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum compromisso para hoje.</p>
          ) : pendingTodayEvents.length === 0 ? (
            <p className="text-sm text-emerald-400 text-center py-4">
              Maravilha, todos os compromissos do dia foram concluídos! ✅
            </p>
          ) : (
            <div className="space-y-2">
              {pendingTodayEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-amber-400/40 transition text-left"
                >
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (evt.source === 'training' && evt.sourceId) {
                        navigate(`/training/${evt.sourceId}`);
                      } else if (evt.source === 'mission' && evt.sourceId) {
                        completeMission(evt.sourceId);
                      } else {
                        toggleComplete(evt.id);
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleComplete(evt.id);
                      }}
                      className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 border-amber-400/40 hover:bg-amber-400/20"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {evt.source === 'training' && (
                          <Dumbbell className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <p className="text-sm truncate font-medium">{evt.name}</p>
                      </div>
                      {evt.time && <p className="text-[10px] text-muted-foreground">{evt.time}</p>}
                    </div>
                  </div>

                  {evt.source === 'training' && evt.sourceId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/training/${evt.sourceId}`)}
                      className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-display text-xs uppercase tracking-wider shrink-0 transition"
                    >
                      Iniciar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleCard>

        {/* ===== MISSÕES DIÁRIAS ===== */}
        <CollapsibleCard
          icon={<Target className="w-5 h-5 text-cyan-400" />}
          iconBg="bg-cyan-500/15 border-cyan-500/40"
          title="Missões Diárias"
          subtitle="Complete missões e ganhe XP"
          countValue={dailyMissions.length}
          countColor="text-cyan-400"
          open={missionsOpen}
          onToggle={() => setMissionsOpen((v) => !v)}
          delay={0.36}
        >
          {allDailyMissions.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhuma missão ativa.<br />
                <span className="text-xs">Crie sua primeira missão para começar sua evolução.</span>
              </p>
              <button
                onClick={() => navigate('/missions')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/60 text-cyan-400 hover:bg-cyan-400/10 font-display text-xs tracking-[0.2em] uppercase transition"
              >
                <Target className="w-4 h-4" /> Criar missão
              </button>
            </div>
          ) : dailyMissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Todas as missões diárias foram concluídas! 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {dailyMissions.map((m) => (
                <button
                  key={m.id}
                  onClick={() => completeDailyAction(m.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-cyan-400/40 transition text-left"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-cyan-400/40 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-cyan-400 opacity-0 group-hover:opacity-60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{m.dailyAction}</p>
                  </div>
                  <span className="text-xs font-display text-cyan-400/80 shrink-0">+{XP_PER_ACTION[m.difficulty] ?? 0} XP</span>
                </button>
              ))}
            </div>
          )}
        </CollapsibleCard>

        {/* ===== BATALHAS EM ANDAMENTO ===== */}
        <CollapsibleCard
          icon={<Swords className="w-5 h-5 text-rose-400" />}
          iconBg="bg-rose-500/15 border-rose-500/40"
          title="Batalhas em Andamento"
          subtitle="Enfrente chefões e supere seus limites"
          countValue={activeBattles.length}
          countColor="text-rose-400"
          open={bossOpen}
          onToggle={() => setBossOpen((v) => !v)}
          delay={0.42}
        >
          {activeBattles.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Nenhuma batalha ativa.</p>
              <button onClick={() => navigate('/bosses')} className="text-xs font-display tracking-wider text-rose-400 hover:underline">
                ESCOLHER UM CHEFÃO →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBattles.map(({ boss, battle }) => {
                const todayAction = getTodayBossAction(boss.id);
                const progress = getProgress(boss.id);
                return (
                  <div key={boss.id} className="rounded-lg bg-muted/30 border border-border/50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skull className="w-4 h-4 text-rose-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{boss.name}</p>
                        <p className="text-[10px] text-muted-foreground">Dia {battle.currentDay} / {battle.durationDays}</p>
                      </div>
                      <span className="text-xs font-display text-rose-400">{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-rose-400" style={{ width: `${progress}%`, boxShadow: '0 0 8px hsl(0 70% 60% / 0.5)' }} />
                    </div>
                    {todayAction ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 rounded-md bg-rose-500/10 border border-rose-500/30">
                          <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="text-xs truncate">{todayAction.action}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => recordDayAction(boss.id, todayAction.day, true)}
                            className="px-2 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 transition text-xs font-display tracking-wider text-emerald-300"
                          >
                            ✅ CONCLUIR
                          </button>
                          <button
                            onClick={() => recordDayAction(boss.id, todayAction.day, false)}
                            className="px-2 py-1.5 rounded-md bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 transition text-xs font-display tracking-wider text-rose-300"
                          >
                            ✖ FALHEI
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center">✅ Ação de hoje registrada — volte amanhã</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleCard>
      </div>

      <LevelUpOverlay level={user.level} show={false} onComplete={() => {}} />
    </MainLayout>

  );
}

interface CollapsibleCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  countLabel?: string;
  countValue: number;
  countColor: string;
  open: boolean;
  onToggle: () => void;
  delay?: number;
  children: React.ReactNode;
}

function CollapsibleCard({
  icon, iconBg, title, subtitle, countValue, countColor,
  open, onToggle, delay = 0, children,
}: CollapsibleCardProps) {
  return (
    <motion.div
      className="mt-3 rounded-2xl border border-border bg-card/70 overflow-hidden"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        <div className={cn('w-12 h-12 rounded-xl border flex items-center justify-center shrink-0', iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm tracking-wider uppercase text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="rounded-lg border border-border/60 px-3 py-1 min-w-[48px] flex items-center justify-center">
            <p className={cn('font-display text-lg leading-tight', countColor)}>{countValue}</p>
          </div>
          <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-border/40">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
