import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { useBoss } from '@/contexts/BossContext';
import { useGame } from '@/contexts/GameContext';
import { difficultyLabels, difficultyColors } from '@/types/boss';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Skull, Swords, Trophy, XCircle, Star, ArrowLeft,
  Clock, AlertTriangle, CheckCircle2, X, Shield,
  BookOpen, Heart, Crosshair, Trash2,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState, useEffect, useRef } from 'react';

export default function BossDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { bosses, getBattle, startBattle, recordDayAction, getProgress, abandonBattle, markRewardsProcessed, deleteBoss } = useBoss();
  const { applyBossPenalty, applyBossReward } = useGame();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [bestiaryOpen, setBestiaryOpen] = useState(false);
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const [confirmAbandonOpen, setConfirmAbandonOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [testUnlocked, setTestUnlocked] = useState(false);

  const boss = bosses.find(b => b.id === id);
  const battle = boss ? getBattle(boss.id) : null;
  const progress = boss ? getProgress(boss.id) : 0;

  useEffect(() => {
    if (!battle || !boss) return;
    if (battle.rewardsProcessed) return;
    if (battle.status === 'lost') {
      if (boss.rules?.penaltyAreas && boss.rules?.penaltyPoints) {
        applyBossPenalty(boss.rules.penaltyAreas, boss.rules.penaltyPoints);
      }
      markRewardsProcessed(boss.id);
    } else if (battle.status === 'won') {
      if (boss.rules?.rewardAreas && boss.rules?.rewardXp) {
        applyBossReward(boss.rules.rewardAreas, boss.rules.rewardXp);
      }
      markRewardsProcessed(boss.id);
    }
  }, [battle?.status, battle?.rewardsProcessed, boss, applyBossPenalty, applyBossReward, markRewardsProcessed]);

  if (!boss || !battle) {
    return (
      <MainLayout>
        <PageTransition>
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">Boss não encontrado.</p>
          </div>
        </PageTransition>
      </MainLayout>
    );
  }

  const isActive = battle.status === 'active';
  const isFinished = battle.status === 'won' || battle.status === 'lost';

  const difficultyStars: Record<string, number> = {
    common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5,
  };
  const stars = difficultyStars[boss.difficulty] || 1;
  const penaltyXp = boss.rules?.penaltyPoints ?? Math.round(boss.xpReward * 0.4);
  const duration = boss.durationDays ?? battle.durationDays ?? 30;
  const DIFFICULTY_MAX_FAILS: Record<string, number> = {
    legendary: 1, epic: 3, rare: 5, uncommon: 7, common: 10,
  };
  const maxFails = boss.rules?.maxFails ?? DIFFICULTY_MAX_FAILS[boss.difficulty] ?? Math.ceil(duration * 0.3);

  // Split name: "MORTH'ZUL - O Devorador de Vitalidade" (aceita "-", "–" ou ":", com ou sem espaços)
  const splitMatch = boss.name.match(/^(.*?)\s*[-–:]\s*(.+)$/);
  const displayName = (splitMatch ? splitMatch[1] : boss.name).trim();
  const subtitle = (splitMatch ? splitMatch[2] : '').trim();
  const isCustom = boss.id.startsWith('boss-custom-');

  // Vida do Boss = 100 - progress (progress = successes / duration)
  const bossHealth = Math.max(0, 100 - progress);
  const healthColor =
    bossHealth > 60 ? 'bg-green-500'
    : bossHealth > 30 ? 'bg-yellow-400'
    : 'bg-red-500';
  const healthText =
    bossHealth > 60 ? 'text-green-400'
    : bossHealth > 30 ? 'text-yellow-400'
    : 'text-red-400';

  const successCount = battle.days.filter(d => d.status === 'success').length;
  const failCount = battle.days.filter(d => d.status === 'fail').length;
  const selectedDayData = selectedDay ? battle.days.find(d => d.day === selectedDay) : null;

  return (
    <MainLayout>
      <PageTransition>
        <div className="min-h-screen p-4 pb-24 max-w-2xl mx-auto space-y-6">

          {/* Back */}
          <button
            onClick={() => navigate('/bosses')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="w-9 h-9 rounded-xl border border-border/50 bg-card/60 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </span>
            Voltar
          </button>

          {/* NAME + SUBTITLE */}
          <div className="text-center space-y-1 animate-fade-in">
            <h1 className="font-display text-3xl tracking-[0.15em] uppercase bg-gradient-to-r from-amber-300 via-primary to-amber-500 bg-clip-text text-transparent">
              {displayName}
            </h1>
            {subtitle && (
              <p className="text-lg text-foreground/90 font-light">{subtitle}</p>
            )}
          </div>

          {/* PORTRAIT */}
          <div className="relative mx-auto w-full max-w-[300px] animate-fade-in" style={{ animationDelay: '0.05s' }}>
            {/* Stars */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {Array.from({ length: stars }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_hsl(45_100%_60%/0.6)]" />
              ))}
            </div>
            <div className={cn(
              "aspect-square rounded-2xl border-2 overflow-hidden bg-card/80",
              "border-primary/50 shadow-[0_0_40px_hsl(var(--primary)/0.25)]"
            )}>
              {boss.portrait ? (
                <img 
                  src={boss.portrait} 
                  alt={displayName} 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = '/images/bosses/boss-morthzul.jpg' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Skull className="w-24 h-24 text-primary" />
                </div>
              )}
            </div>
            {isCustom && (
              <button
                onClick={() => setConfirmDeleteOpen(true)}
                aria-label="Excluir chefão"
                className="absolute top-2 right-2 z-10 w-9 h-9 rounded-lg border border-red-500/40 bg-black/60 backdrop-blur-sm text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* VÍCIO + RARIDADE */}
          <div className="text-center space-y-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <p className="text-sm text-muted-foreground">
              Vício: <span className="text-primary font-medium">{boss.vice}</span>
            </p>
            <p className={cn("text-sm font-semibold", difficultyColors[boss.difficulty])}>
              {difficultyLabels[boss.difficulty]}
            </p>
          </div>

          {/* ACESSAR BESTIÁRIO */}
          <div className="flex justify-center animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <Button
              variant="outline"
              onClick={() => setBestiaryOpen(true)}
              className="border-primary/40 text-primary hover:bg-primary/10 px-6"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Acessar Bestiário
            </Button>
          </div>

          {/* VIDA DO BOSS */}
          <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className={cn("w-4 h-4", healthText)} />
                <span className={cn("text-sm font-medium", healthText)}>Vida do Boss</span>
              </div>
              <span className={cn("text-sm font-bold", healthText)}>{bossHealth}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted/30 overflow-hidden border border-border/40">
              <div
                className={cn("h-full rounded-full transition-all duration-700 ease-out", healthColor)}
                style={{ width: `${bossHealth}%` }}
              />
            </div>
          </div>

          {/* CARDS INFERIORES */}
          <div className="grid grid-cols-4 gap-2 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <div className="p-3 rounded-xl bg-card/60 border border-border/50 text-center space-y-1">
              <Star className="w-5 h-5 mx-auto text-primary fill-primary/20" />
              <p className="text-xs font-bold text-primary">+{boss.xpReward}XP</p>
              <p className="text-[10px] text-muted-foreground">Recompensa</p>
            </div>
            <div className="p-3 rounded-xl bg-card/60 border border-border/50 text-center space-y-1">
              <AlertTriangle className="w-5 h-5 mx-auto text-red-400" />
              <p className="text-xs font-bold text-red-400">-{penaltyXp}XP</p>
              <p className="text-[10px] text-muted-foreground">Punição</p>
            </div>
            <div className="p-3 rounded-xl bg-card/60 border border-border/50 text-center space-y-1">
              <Shield className="w-5 h-5 mx-auto text-purple-400" />
              <p className="text-xs font-bold text-purple-400">{maxFails} {maxFails === 1 ? 'falha' : 'falhas'}</p>
              <p className="text-[10px] text-muted-foreground">Falhas permitidas</p>
            </div>
            <div className="p-3 rounded-xl bg-card/60 border border-border/50 text-center space-y-1">
              <Clock className="w-5 h-5 mx-auto text-blue-400" />
              <p className="text-xs font-bold text-blue-400">{duration}d</p>
              <p className="text-[10px] text-muted-foreground">Duração</p>
            </div>
          </div>

          {/* AÇÃO PRINCIPAL */}
          <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {!isActive && !isFinished ? (
              <Button
                onClick={() => setConfirmStartOpen(true)}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wider uppercase text-sm gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
              >
                <Swords className="w-5 h-5" />
                Entrar em Batalha
              </Button>
            ) : isActive ? (
              <Button
                onClick={() => setConfirmAbandonOpen(true)}
                variant="outline"
                className="w-full h-12 border-red-500/40 text-red-400 hover:bg-red-500/10 font-bold tracking-wider uppercase text-sm gap-2"
              >
                <X className="w-5 h-5" />
                Abandonar Batalha
              </Button>
            ) : isFinished ? (
              <Button
                onClick={() => setConfirmStartOpen(true)}
                variant="outline"
                className="w-full h-12 border-primary/30 text-primary hover:bg-primary/10 font-bold tracking-wider uppercase text-sm gap-2"
              >
                <Swords className="w-5 h-5" />
                {battle.status === 'won' ? 'Lutar Novamente' : 'Tentar Novamente'}
              </Button>
            ) : null}
          </div>

          {/* ESTATÍSTICAS */}
          <div className="flex items-center justify-center gap-6 py-2 animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <div className="flex items-center gap-1.5 text-sm">
              <Trophy className="w-4 h-4 text-green-400" />
              <span className="text-muted-foreground">Vitórias:</span>
              <span className="text-green-400 font-bold">{battle.wins}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-muted-foreground">Derrotas:</span>
              <span className="text-red-400 font-bold">{battle.losses}</span>
            </div>
          </div>

          {/* CALENDÁRIO DE GOLPES */}
          {(isActive || isFinished) && (
            <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="text-center space-y-1">
                <h2 className="font-display text-sm tracking-wider text-primary uppercase">Golpes</h2>
                <p className="text-xs text-muted-foreground">Realize ataques diários para derrotar o boss</p>
              </div>

              <div className="p-4 rounded-xl bg-card/60 border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-muted-foreground">Clique no dia para registrar o ataque</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-primary/30 border border-primary/50" /> Sucesso
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-500/30 border border-red-500/50" /> Falha
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
                    <div key={i} className="text-center text-[9px] text-muted-foreground/60 font-medium">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {(() => {
                    const todayStr = new Date().toDateString();
                    const actedToday = battle.days.some(
                      d => d.completedAt && new Date(d.completedAt).toDateString() === todayStr
                    );
                    return battle.days.map((dayData) => {
                    const isCurrent = dayData.day === battle.currentDay;
                    const isRecorded = dayData.status === 'success' || dayData.status === 'fail';
                    // Recorded days: always clickable for read-only view.
                    // Pending days: clickable if active AND (test unlocked OR (not acted today AND is current day)).
                    const isClickable =
                      isRecorded ||
                      (isActive && dayData.status === 'pending' && (testUnlocked || (!actedToday && dayData.day === battle.currentDay)));
                    return (
                      <button
                        key={dayData.day}
                        disabled={!isClickable}
                        onClick={() => isClickable && setSelectedDay(dayData.day)}
                        className={cn(
                          "aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-medium transition-all duration-200 border",
                          dayData.status === 'success'
                            ? "bg-primary/15 border-primary/40 text-primary shadow-[0_0_8px_hsl(var(--primary)/0.2)]"
                            : dayData.status === 'fail'
                              ? "bg-red-500/15 border-red-500/40 text-red-400"
                              : isCurrent && isActive
                                ? "bg-primary/10 border-primary text-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)] cursor-pointer hover:bg-primary/20"
                                : testUnlocked && isActive
                                  ? "bg-muted/10 border-border/50 text-muted-foreground hover:bg-primary/10 hover:border-primary/40"
                                  : "bg-muted/5 border-border/30 text-muted-foreground/40",
                          isClickable && "cursor-pointer hover:scale-105"
                        )}
                      >
                        <span>{dayData.day}</span>
                        {dayData.status === 'success' && <CheckCircle2 className="w-2.5 h-2.5 mt-0.5" />}
                        {dayData.status === 'fail' && <X className="w-2.5 h-2.5 mt-0.5" />}
                      </button>
                    );
                  });
                  })()}
                </div>
              </div>


              <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
                <DialogContent className="bg-card border-border/50">
                  <DialogHeader>
                    <DialogTitle className="text-primary font-display tracking-wider">Dia {selectedDay}</DialogTitle>
                  </DialogHeader>
                  {selectedDayData && (
                    <div className="space-y-4 pt-2">
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ação do dia</p>
                        <p className="text-sm text-foreground font-medium">{selectedDayData.action}</p>
                      </div>
                      {selectedDayData.status === 'pending' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={() => { recordDayAction(boss.id, selectedDay!, true); setSelectedDay(null); }}
                            className="h-16 flex-col gap-1 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20"
                            variant="ghost"
                          >
                            <CheckCircle2 className="w-6 h-6" />
                            <span className="text-xs font-medium">Concluir ação</span>
                          </Button>
                          <Button
                            onClick={() => { recordDayAction(boss.id, selectedDay!, false); setSelectedDay(null); }}
                            className="h-16 flex-col gap-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                            variant="ghost"
                          >
                            <X className="w-6 h-6" />
                            <span className="text-xs font-medium">Falhei hoje</span>
                          </Button>
                        </div>
                      ) : (
                        <div className={cn(
                          "p-3 rounded-lg border text-center flex items-center justify-center gap-2",
                          selectedDayData.status === 'success'
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                        )}>
                          {selectedDayData.status === 'success' ? (
                            <><CheckCircle2 className="w-5 h-5" /><span className="text-sm font-medium">Concluída</span></>
                          ) : (
                            <><X className="w-5 h-5" /><span className="text-sm font-medium">Falhou</span></>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-2">(apenas consulta)</span>
                        </div>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>


              {isFinished && (
                <div className={cn(
                  "p-4 rounded-xl border text-center",
                  battle.status === 'won' ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
                )}>
                  <p className={cn(
                    "font-display text-lg tracking-wider",
                    battle.status === 'won' ? "text-green-400" : "text-red-400"
                  )}>
                    {battle.status === 'won' ? '🏆 VITÓRIA!' : '💀 DERROTA'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {battle.status === 'won'
                      ? `Você ganhou ${boss.xpReward} XP!`
                      : `Você perdeu ${penaltyXp} pontos.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* BESTIÁRIO MODAL */}
          <Dialog open={bestiaryOpen} onOpenChange={setBestiaryOpen}>
            <DialogContent className="bg-card border-border/50 max-h-[85vh] overflow-y-auto max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl tracking-wider uppercase bg-gradient-to-r from-amber-300 via-primary to-amber-500 bg-clip-text text-transparent text-center">
                  {displayName}
                </DialogTitle>
                {subtitle && (
                  <p className="text-center text-sm text-foreground/80">{subtitle}</p>
                )}
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {boss.description && (
                  <section className="space-y-2">
                    <h3 className="text-xs uppercase tracking-widest text-primary font-semibold flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" /> Descrição
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{boss.description}</p>
                  </section>
                )}

                {boss.origin && (
                  <section className="space-y-2">
                    <h3 className="text-xs uppercase tracking-widest text-primary font-semibold">Origem</h3>
                    <p className="text-sm text-muted-foreground italic leading-relaxed">"{boss.origin}"</p>
                  </section>
                )}

                {boss.abilities && boss.abilities.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-xs uppercase tracking-widest text-red-400 font-semibold flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" /> Habilidades
                    </h3>
                    <div className="space-y-2">
                      {boss.abilities.map((a, i) => (
                        <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                          <p className="text-sm font-semibold text-red-400">{a.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {boss.weaknesses && boss.weaknesses.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-xs uppercase tracking-widest text-green-400 font-semibold flex items-center gap-2">
                      <Crosshair className="w-3.5 h-3.5" /> Fraquezas
                    </h3>
                    <div className="space-y-2">
                      {boss.weaknesses.map((w, i) => (
                        <div key={i} className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                          <p className="text-sm font-semibold text-green-400">{w.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{w.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {(() => {
                  const penaltyAreas = boss.rules?.penaltyAreas || [boss.attributeArea || 'Mental'];
                  const rewardAreas = boss.rules?.rewardAreas || [boss.attributeArea || 'Mental'];
                  const penaltyPoints = boss.rules?.penaltyPoints ?? boss.penaltyXp ?? 100;
                  const rewardXp = boss.rules?.rewardXp ?? boss.xpReward ?? 300;

                  const splitAreas = (total: number, areas: string[]) => {
                    if (areas.length === 2) {
                      const first = Math.round(total * 0.3);
                      return [first, total - first];
                    }
                    if (areas.length === 0) return [] as number[];
                    const base = Math.floor(total / areas.length);
                    const rest = total - base * areas.length;
                    return areas.map((_, i) => base + (i < rest ? 1 : 0));
                  };
                  const fmtDist = (total: number, areas: string[], sign: '+' | '-') => {
                    const parts = splitAreas(total, areas);
                    return areas.map((a, i) => `${sign}${parts[i]} em ${a}`).join(' e ');
                  };
                  return (
                    <section className="space-y-2">
                      <h3 className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Regras da Batalha</h3>
                      <div className="text-xs text-muted-foreground space-y-1.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <p>💀 <span className="text-foreground">Penalidade:</span> -{penaltyPoints} XP | {fmtDist(penaltyPoints, penaltyAreas, '-')}</p>
                        <p>🏆 <span className="text-foreground">Recompensa:</span> +{rewardXp} XP | {fmtDist(rewardXp, rewardAreas, '+')}</p>
                        <p>📜 <span className="text-foreground">Pós-batalha:</span> Compartilhar o resultado na aba "Arena de Chefões" da comunidade (mesmo em caso de derrota).</p>
                      </div>
                    </section>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>

          {/* CONFIRMAR INÍCIO DE BATALHA */}
          <Dialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
            <DialogContent className="bg-card border-border/50 max-h-[90vh] overflow-y-auto max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-xl tracking-wider uppercase text-center text-primary flex items-center justify-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Prepare-se para a Batalha
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed pt-2">
                <p>
                  Esta batalha foi construída com base em princípios da <span className="text-foreground font-medium">Psicologia, Neurociência e Terapia Cognitivo-Comportamental (TCC)</span>, mas não substitui acompanhamento profissional quando necessário.
                </p>
                <p>
                  O objetivo não é apenas vencer um hábito, vício ou problema específico, mas sim desenvolver <span className="text-foreground">autoconsciência, disciplina, regulação emocional e controle</span> sobre comportamentos que hoje limitam o seu potencial.
                </p>
                <p>Ao longo dos próximos <span className="text-primary font-semibold">30 dias</span>, cada golpe foi cuidadosamente planejado para:</p>
                <ul className="space-y-1 pl-2">
                  <li>• Identificar e enfraquecer gatilhos automáticos.</li>
                  <li>• Fortalecer sua capacidade de autocontrole.</li>
                  <li>• Desenvolver novos padrões de pensamento e comportamento.</li>
                  <li>• Criar fontes mais saudáveis de recompensa e satisfação.</li>
                  <li>• Aumentar sua clareza mental e consciência emocional.</li>
                </ul>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-1">
                    <Swords className="w-3.5 h-3.5" /> IMPORTANTE
                  </p>
                  <p className="text-xs text-foreground/90">
                    Após iniciar o combate, você não poderá enfrentar outro BOSS até vencer ou ser derrotado pelo atual.
                  </p>
                </div>
                <p className="text-center text-foreground font-medium pt-1">
                  Tem certeza que está pronto para iniciar este combate?
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-3">
                <Button
                  onClick={() => { setConfirmStartOpen(false); startBattle(boss.id); }}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wider uppercase text-sm shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                >
                  Sim, estou pronto!
                </Button>
                <Button
                  onClick={() => setConfirmStartOpen(false)}
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Não, preciso me preparar melhor
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* CONFIRMAR ABANDONO */}
          <Dialog open={confirmAbandonOpen} onOpenChange={setConfirmAbandonOpen}>
            <DialogContent className="bg-card border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-lg tracking-wider uppercase text-center text-red-400 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Abandonar Batalha?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed pt-2">
                <p>
                  Se você abandonar esta batalha, ela será considerada uma <span className="text-red-400 font-bold uppercase">Derrota</span>.
                </p>
                <p>
                  Você perderá todo o progresso desta batalha e somente poderá iniciar uma nova após encerrar este combate.
                </p>
                <p className="text-center text-foreground font-medium pt-1">
                  Tem certeza que deseja abandonar?
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-3">
                <Button
                  onClick={() => { setConfirmAbandonOpen(false); abandonBattle(boss.id); }}
                  className="w-full h-11 bg-red-500 hover:bg-red-500/90 text-white font-bold tracking-wider uppercase text-sm"
                >
                  Sim, abandonar batalha
                </Button>
                <Button
                  onClick={() => setConfirmAbandonOpen(false)}
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Chefão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este Chefão? Esta ação não poderá ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setConfirmDeleteOpen(false);
                    deleteBoss(boss.id);
                    navigate('/bosses');
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageTransition>
    </MainLayout>
  );
}
