import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { useGame } from '@/contexts/GameContext';
import { useBoss } from '@/contexts/BossContext';
import { difficultyLabels } from '@/types/boss';
import { cn } from '@/lib/utils';
import { Skull, Trophy, XCircle, Star, ChevronRight, Lock, Plus, ScrollText, Trash2, User } from 'lucide-react';
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

const AREA_BADGES: Record<string, { icon: string; color: string }> = {
  'Espiritual': { icon: '✨', color: 'bg-amber-500/10 text-amber-400 border-amber-400/30' },
  'Mental': { icon: '🧠', color: 'bg-purple-500/10 text-purple-400 border-purple-400/30' },
  'Profissional': { icon: '💼', color: 'bg-green-500/10 text-green-400 border-green-400/30' },
  'Físico': { icon: '💪', color: 'bg-blue-500/10 text-blue-400 border-blue-400/30' },
  'Financeiro': { icon: '💰', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-400/30' },
};

export default function Bosses() {
  const { user } = useGame();
  const { bosses, battles, getBattle, deleteBoss } = useBoss();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKind>('all');
  const [quizOpen, setQuizOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const rawClass = user.userClass || (typeof window !== 'undefined' ? localStorage.getItem('user_class') : '') || '';
  const classLabel = CLASS_LABELS[rawClass] || rawClass || 'Aventureiro';

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
              <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-amber-400/60 shrink-0 bg-[#050b14] flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                {(!user.avatar || user.avatar.includes('placeholder.svg')) ? (
                  <User className="w-10 h-10 text-amber-500/50" />
                ) : (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                )}
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

            {/* Vitórias / Derrotas */}
            <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-2 gap-3 text-center">
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-center gap-1.5 text-green-400 font-bold">
                  <Trophy className="w-4 h-4" />
                  <span>{wins}</span>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Vitórias</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center justify-center gap-1.5 text-red-400 font-bold">
                  <XCircle className="w-4 h-4" />
                  <span>{losses}</span>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Derrotas</p>
              </div>
            </div>
          </div>

          {/* Botão Criar Chefão */}
          <Button
            onClick={() => setQuizOpen(true)}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wider uppercase text-sm gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          >
            <Plus className="w-5 h-5" />
            Criar Novo Boss
          </Button>

          {/* Filtros */}
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
                className="h-8 text-xs font-semibold uppercase tracking-wider"
              >
                Todos ({bosses.length})
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('active')}
                className="h-8 text-xs font-semibold uppercase tracking-wider"
              >
                Em Batalha ({Object.values(battles).filter(b => b.status === 'active').length})
              </Button>
            </div>
          </div>

          {/* Boss list */}
          <div className="space-y-3 animate-fade-in">
            {visibleBosses.map(boss => {
              const isLocked = boss.requiredLevel !== undefined && user.level < boss.requiredLevel;
              const battle = getBattle(boss.id);
              const inBattle = battle.status === 'active';

              // Split "Nome - Subtítulo"
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
              const areaBadge = AREA_BADGES[boss.attributeArea] || AREA_BADGES['Mental'];

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
                              <img 
                                src={boss.portrait} 
                                alt={displayName} 
                                className="w-full h-full object-cover" 
                                loading="lazy" 
                                onError={(e) => { e.currentTarget.src = '/images/bosses/boss-morthzul.jpg' }}
                              />
                            ) : (
                              <Skull className={cn('w-8 h-8', boss.defeated ? 'text-green-400' : 'text-amber-400')} />
                            )}
                          </div>
                          {!isLocked && (
                            <span className={cn(
                              'absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md border text-[9px] font-bold tracking-wider uppercase whitespace-nowrap',
                              badge.bg, badge.border, badge.text
                            )}>
                              {difficultyLabels[boss.difficulty]}
                            </span>
                          )}
                        </div>
                        {!isLocked && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: starsCount }).map((_, i) => (
                              <Star key={i} className={cn('w-3 h-3 fill-current', badge.text)} />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn(
                            'font-bold text-base uppercase tracking-wide leading-tight',
                            isLocked ? 'text-muted-foreground' : boss.defeated ? 'text-muted-foreground line-through' : 'text-foreground'
                          )}>
                            {isLocked ? '???' : displayName}
                          </h3>
                          {!isLocked && boss.attributeArea && (
                            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1', areaBadge.color)}>
                              <span>{areaBadge.icon}</span>
                              <span>{boss.attributeArea}</span>
                            </span>
                          )}
                        </div>
                        {!isLocked && subtitle && (
                          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                        )}
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-muted-foreground">
                            <span className="text-foreground/80 font-semibold">Problema:</span>{' '}
                            <span className="text-amber-400">{isLocked ? '???' : boss.class}</span>
                          </p>
                          {!isLocked && (
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/60" />
                              <span className="text-foreground/80 text-xs">Recompensa:</span>
                              <span className="text-amber-400 font-semibold">+{boss.xpReward} XP em {boss.attributeArea}</span>
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
                        {!boss.isSystem && !isLocked && (
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
          </div>

          {/* Modal Histórico */}
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogContent className="bg-card border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-lg tracking-wider uppercase text-amber-400 flex items-center gap-2">
                  <ScrollText className="w-5 h-5" />
                  Histórico de Batalhas
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    Nenhuma batalha concluída ainda.
                  </p>
                ) : (
                  history.map((h, i) => (
                    <div key={i} className="p-3 rounded-lg bg-background/50 border border-border/40 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{h.bossName}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5">
                          {h.startedAt ? new Date(h.startedAt).toLocaleDateString('pt-BR') : 'Data N/D'}
                        </p>
                      </div>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                        h.status === 'won' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                      )}>
                        {h.status === 'won' ? 'Vitória' : 'Derrota'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal Excluir */}
          <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Chefão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este Chefão? Esta ação não pode ser desfeita e removerá o registro no banco de dados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (deleteId) {
                      deleteBoss(deleteId);
                      setDeleteId(null);
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Quiz Dialog */}
          <BossQuizDialog open={quizOpen} onOpenChange={setQuizOpen} />

        </div>
      </PageTransition>
    </MainLayout>
  );
}
