import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { useGame } from '@/contexts/GameContext';
import { useBoss } from '@/contexts/BossContext';
import { difficultyLabels, difficultyColors } from '@/types/boss';
import { cn } from '@/lib/utils';
import { Skull, Trophy, XCircle, Star, ChevronRight, Lock, Plus, ScrollText, LayoutGrid, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { BossQuizDialog } from '@/components/bosses/BossQuizDialog';

type FilterKind = 'all' | 'active';

const CLASS_LABELS: Record<string, string> = {
  warrior: 'Guerreiro', mage: 'Mago', guardian: 'Guardião',
  rogue: 'Ladino', paladin: 'Paladino', monk: 'Monge',
};

export default function Bosses() {
  const { user } = useGame();
  const { bosses, battles, getBattle, deleteBoss } = useBoss();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKind>('all');
  const [quizOpen, setQuizOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const userClass = (typeof window !== 'undefined' ? localStorage.getItem('user_class') : '') || '';
  const classLabel = CLASS_LABELS[userClass] || 'Aventureiro';

  const wins = bosses.reduce((sum, b) => sum + (getBattle(b.id).wins || 0), 0);
  const losses = bosses.reduce((sum, b) => sum + (getBattle(b.id).losses || 0), 0);

  const visibleBosses = bosses.filter(b => {
    if (filter === 'active') return getBattle(b.id).status === 'active';
    return true;
  });

  const history = useMemo(() => {
    return Object.values(battles)
      .filter(b => b.status === 'won' || b.status === 'lost')
      .map(b => {
        const boss = bosses.find(x => x.id === b.bossId);
        return {
          bossName: boss?.name ?? 'Chefão',
          startedAt: b.startedAt,
          status: b.status,
        };
      })
      .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
  }, [battles, bosses]);

  return (
    <MainLayout>
      <PageTransition>
        <div className="min-h-screen p-4 pb-24 max-w-2xl mx-auto space-y-5">

          {/* Título centralizado (ícone + título) */}
          <div className="text-center animate-fade-in pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-md bg-background/40">
              <Skull className="w-6 h-6" style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.55))' }} />
              <h1 className="font-display text-3xl tracking-[0.25em] uppercase" style={{ background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                CHEFÕES
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-3 px-6">
              Derrote seus vícios e dificuldades na forma de chefões e prove seu valor.
            </p>
          </div>

          {/* Card do jogador */}
          <div className="relative p-4 rounded-xl bg-card/60 border border-amber-400/30 animate-fade-in" style={{ boxShadow: '0 0 24px rgba(245,158,11,0.08)' }}>
            <button
              onClick={() => setHistoryOpen(true)}
              className="absolute top-3 right-3 w-9 h-9 rounded-lg border border-amber-400/50 bg-background/40 flex items-center justify-center text-amber-400 hover:bg-amber-400/10"
              aria-label="Histórico de batalhas"
            >
              <ScrollText className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4 pr-10">
              <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-amber-400/60 shrink-0 bg-muted shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="font-display text-2xl tracking-wider truncate">{user.name}</p>
                <p className="text-sm">
                  <span className="text-amber-400 font-semibold">Classe:</span>{' '}
                  <span className="text-foreground/90">{classLabel}</span>
                </p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-muted-foreground">Nível Atual:</span>
                  <span className="text-amber-400 font-bold">{user.level}</span>
                </div>
              </div>
            </div>

            {/* Vitórias/Derrotas centralizado */}
            <div className="mt-4 pt-4 border-t border-amber-400/20 grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center gap-1">
                <Trophy className="w-8 h-8 text-green-400" />
                <span className="text-xs text-muted-foreground">Vitórias</span>
                <span className="text-green-400 font-bold text-lg">{wins}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <XCircle className="w-8 h-8 text-red-400" />
                <span className="text-xs text-muted-foreground">Derrotas</span>
                <span className="text-red-400 font-bold text-lg">{losses}</span>
              </div>
            </div>
          </div>

          {/* Criar novo boss */}
          <Button
            variant="outline"
            className="w-full border-dashed border-amber-400/50 text-amber-400 hover:bg-amber-400/10 h-14 tracking-[0.2em] uppercase font-bold animate-fade-in"
            onClick={() => setQuizOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Criar Novo Boss
          </Button>
          <BossQuizDialog open={quizOpen} onOpenChange={setQuizOpen} />

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'h-14 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all',
                filter === 'all'
                  ? 'border-amber-400/70 bg-amber-400/10 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.2)]'
                  : 'border-border/50 bg-card/60 text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Todos
            </button>
            <button
              onClick={() => setFilter('active')}
              className={cn(
                'h-14 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all',
                filter === 'active'
                  ? 'border-amber-400/70 bg-amber-400/10 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.2)]'
                  : 'border-border/50 bg-card/60 text-muted-foreground hover:text-foreground'
              )}
            >
              <Skull className="w-4 h-4" />
              Em Batalha
            </button>
          </div>

          {/* Divisor */}
          <div className="animate-fade-in space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-400/40" />
              <h2 className="font-display text-sm tracking-[0.3em] uppercase text-amber-400">Teste sua Coragem</h2>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-400/40" />
            </div>
            <p className="text-xs text-muted-foreground text-center px-4">
              Atenção! Só é possível enfrentar um BOSS por vez, portanto escolha suas batalhas com sabedoria.
            </p>
          </div>

          {/* Boss list */}
          <div className="space-y-3 animate-fade-in">
            {visibleBosses.map(boss => {
              const isLocked = boss.requiredLevel !== undefined && user.level < boss.requiredLevel;
              const battle = getBattle(boss.id);
              const inBattle = battle.status === 'active';

              // Split "Nome - Subtítulo" (aceita "-", "–" ou ":", com ou sem espaços)
              const splitMatch = boss.name.match(/^(.*?)\s*[-–:]\s*(.+)$/);
              const displayName = (splitMatch ? splitMatch[1] : boss.name).trim();
              const subtitle = (splitMatch ? splitMatch[2] : '').trim();

              const difficultyStars: Record<string, number> = {
                common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5,
              };
              const difficultyBadgeColors: Record<string, { bg: string; border: string; text: string }> = {
                common:    { bg: 'bg-muted/30',      border: 'border-muted-foreground/40', text: 'text-muted-foreground' },
                uncommon:  { bg: 'bg-green-500/10',  border: 'border-green-400/60',        text: 'text-green-400' },
                rare:      { bg: 'bg-blue-500/10',   border: 'border-blue-400/60',         text: 'text-blue-400' },
                epic:      { bg: 'bg-purple-500/10', border: 'border-purple-400/60',       text: 'text-purple-400' },
                legendary: { bg: 'bg-amber-500/10',  border: 'border-amber-400/70',        text: 'text-amber-400' },
              };
              const starsCount = difficultyStars[boss.difficulty] ?? 1;
              const badge = difficultyBadgeColors[boss.difficulty] ?? difficultyBadgeColors.common;

              return (
                <button
                  key={boss.id}
                  onClick={() => !isLocked && navigate(`/bosses/${boss.id}`)}
                  disabled={isLocked}
                  className="w-full text-left group"
                >
                  <div className={cn(
                    'p-3 rounded-xl border transition-all duration-200 bg-card/60 backdrop-blur-sm',
                    isLocked
                      ? 'border-border/30 opacity-50'
                      : 'border-border/50 hover:border-amber-400/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]',
                  )}>
                    <div className="flex items-start gap-3">
                      {/* Portrait com badge + estrelas */}
                      <div className="shrink-0 flex flex-col items-center gap-1.5">
                        <div className="relative w-24 h-24">
                          <div className={cn(
                            'w-full h-full rounded-lg flex items-center justify-center border overflow-hidden',
                            isLocked ? 'bg-muted/20 border-muted/30'
                              : boss.defeated ? 'bg-green-500/10 border-green-500/20'
                              : 'bg-amber-400/10 border-amber-400/30'
                          )}>
                            {isLocked ? (
                              <Lock className="w-6 h-6 text-muted-foreground" />
                            ) : boss.portrait ? (
                              <img src={boss.portrait} alt={displayName} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <Skull className={cn('w-8 h-8', boss.defeated ? 'text-green-400' : 'text-amber-400')} />
                            )}
                          </div>
                          {/* Badge de dificuldade */}
                          {!isLocked && (
                            <span className={cn(
                              'absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md border text-[9px] font-bold tracking-wider uppercase whitespace-nowrap',
                              badge.bg, badge.border, badge.text
                            )}>
                              {difficultyLabels[boss.difficulty]}
                            </span>
                          )}
                        </div>
                        {/* Estrelas de dificuldade */}
                        {!isLocked && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: starsCount }).map((_, i) => (
                              <Star key={i} className={cn('w-3 h-3 fill-current', badge.text)} />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          'font-bold text-base uppercase tracking-wide leading-tight',
                          isLocked ? 'text-muted-foreground' : boss.defeated ? 'text-muted-foreground line-through' : 'text-foreground'
                        )}>
                          {isLocked ? '???' : displayName}
                        </h3>
                        {!isLocked && subtitle && (
                          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                        )}
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-muted-foreground">
                            <span className="text-foreground/80 font-semibold">Classe:</span>{' '}
                            <span className="text-amber-400">{isLocked ? '???' : boss.class}</span>
                          </p>
                          {!isLocked && (
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/60" />
                              <span className="text-foreground/80 text-xs">:</span>
                              <span className="text-amber-400 font-semibold">+{boss.xpReward}XP</span>
                            </p>
                          )}
                          {isLocked && boss.requiredLevel && (
                            <p className="text-[10px] text-red-400/80 font-medium">
                              Requer Nível {boss.requiredLevel}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2 self-center">
                        {inBattle && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-amber-400/40 text-amber-400 bg-amber-400/10">
                            Em Batalha
                          </span>
                        )}
                        {boss.id.startsWith('boss-custom-') && !isLocked && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); setDeleteId(boss.id); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDeleteId(boss.id); } }}
                            className="p-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer"
                            aria-label="Excluir chefão"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {isLocked ? (
                          <Lock className="w-4 h-4 text-muted-foreground/50" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {visibleBosses.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum chefão em batalha no momento.
              </p>
            )}
          </div>

          {/* Histórico */}
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogContent className="bg-card border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-400 font-display tracking-wider uppercase">
                  <ScrollText className="w-4 h-4" />
                  Histórico de Batalhas
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pt-2">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma batalha finalizada ainda.
                  </p>
                ) : (
                  history.map((h, i) => (
                    <div key={i} className={cn(
                      'p-3 rounded-lg border flex items-center justify-between',
                      h.status === 'won'
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                    )}>
                      <div>
                        <p className="text-sm font-semibold">{h.bossName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {h.startedAt ? new Date(h.startedAt).toLocaleDateString('pt-BR') : '—'}
                        </p>
                      </div>
                      <span className={cn(
                        'text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md',
                        h.status === 'won' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                      )}>
                        {h.status === 'won' ? 'Vitória' : 'Derrota'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmação de exclusão */}
          <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
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
                  onClick={() => { if (deleteId) deleteBoss(deleteId); setDeleteId(null); }}
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
