import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { useStreakReward } from '@/hooks/useStreakReward';
import { useShop, ShopItem } from '@/hooks/useShop';
import { Gem, ShoppingCart, Shirt, Shield, Lock, ArrowLeft, Sparkles, Gift, X, Calendar, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Shop() {
  const navigate = useNavigate();
  const { state: streakState } = useStreakReward();
  const {
    visiblePhysicalItems,
    visibleConsumableItems,
    redeemedItemIds,
    redemptionsMap,
    redeemItem,
    isLoading,
  } = useShop();

  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [successItem, setSuccessItem] = useState<ShopItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<ShopItem | null>(null);
  const [showRedeemed, setShowRedeemed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Split physical items into available vs redeemed
  const availablePhysicalItems = useMemo(
    () => visiblePhysicalItems.filter((i) => !redeemedItemIds.has(i.id)),
    [visiblePhysicalItems, redeemedItemIds]
  );

  const redeemedPhysicalItems = useMemo(
    () => visiblePhysicalItems.filter((i) => redeemedItemIds.has(i.id)),
    [visiblePhysicalItems, redeemedItemIds]
  );

  const openConfirm = (item: ShopItem) => {
    if (streakState.total_fragments < item.cost) return;
    setConfirmItem(item);
  };

  const confirmPurchase = async () => {
    const item = confirmItem;
    if (!item) return;

    setIsSubmitting(true);
    try {
      const res = await redeemItem(item);
      if (!res.success) {
        toast.error(res.message || 'Erro ao resgatar item.');
        setConfirmItem(null);
        return;
      }

      if (item.category === 'physical') {
        // Keep dialog open, swap to success view
        setSuccessItem(item);
      } else {
        toast.success(`🛡️ ${item.name} adicionado ao seu inventário!`);
        setConfirmItem(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = () => {
    setConfirmItem(null);
    setSuccessItem(null);
  };

  const renderCard = (item: ShopItem, idx: number) => {
    const canAfford = streakState.total_fragments >= item.cost;
    const isGold = item.accent === 'gold';
    const redeemed = item.category === 'physical' && redeemedItemIds.has(item.id);

    const accentClasses = isGold
      ? {
          border: redeemed
            ? 'border-amber-500/50 hover:border-amber-400/80 bg-amber-950/10'
            : 'border-amber-500/40 hover:border-amber-400/70',
          glow: redeemed ? 'hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'hover:shadow-[0_0_24px_rgba(245,158,11,0.25)]',
          tag: 'border-amber-500/60 bg-black/70 text-amber-400',
          gem: 'text-amber-400',
          price: 'text-amber-400',
          badge: 'border-amber-400/70 bg-black/70 text-amber-300',
          imgFrame: redeemed
            ? 'border-amber-500/50 bg-gradient-to-br from-black to-amber-950/40'
            : 'border-amber-500/40 bg-gradient-to-br from-black to-amber-950/30',
          button: canAfford
            ? 'border-amber-500/70 bg-amber-500 text-black hover:bg-amber-400'
            : 'border-amber-900/60 bg-black/60 text-amber-200/70',
        }
      : {
          border: 'border-sky-500/40 hover:border-sky-400/70',
          glow: 'hover:shadow-[0_0_24px_rgba(56,189,248,0.25)]',
          tag: 'border-sky-500/60 bg-black/70 text-sky-300',
          gem: 'text-sky-400',
          price: 'text-sky-400',
          badge: 'border-sky-400/70 bg-black/70 text-sky-300',
          imgFrame: 'border-sky-500/40 bg-gradient-to-br from-black to-sky-950/40',
          button: canAfford
            ? 'border-sky-500/70 bg-sky-500 text-black hover:bg-sky-400'
            : 'border-sky-900/60 bg-black/60 text-sky-200/70',
        };

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
        className={cn(
          'relative overflow-hidden rounded-2xl border bg-[#0a0a0a] p-3 transition-all',
          accentClasses.border,
          accentClasses.glow
        )}
      >
        <div className="flex items-stretch gap-3">
          {/* Image */}
          <div className="relative shrink-0 cursor-pointer" onClick={() => redeemed && setDetailsItem(item)}>
            <div
              className={cn(
                'w-[110px] h-[110px] rounded-xl border overflow-hidden flex items-center justify-center',
                accentClasses.imgFrame
              )}
            >
              <img
                src={item.image_url}
                alt={item.name}
                className={cn('w-full h-full object-cover', redeemed && 'brightness-90')}
              />
              <div
                className={cn(
                  'absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full border flex items-center justify-center',
                  redeemed ? 'bg-amber-500/90 border-amber-400' : 'bg-black/80 border-white/10'
                )}
              >
                {redeemed ? (
                  <Gift className="w-3 h-3 text-black font-bold" />
                ) : (
                  <Lock className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="font-display text-[15px] leading-tight tracking-wider uppercase text-foreground mb-1">
              {item.name}
            </h3>
            <p className="text-[11.5px] text-muted-foreground/90 leading-snug mb-2 line-clamp-2">
              {item.description}
            </p>

            <div className="mt-auto flex items-center justify-between gap-2">
              {redeemed ? (
                <button
                  type="button"
                  onClick={() => setDetailsItem(item)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-[10.5px] font-display tracking-[0.15em] uppercase text-amber-300 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                >
                  <Gift className="w-3.5 h-3.5 text-amber-400" />
                  Ver Detalhes do Resgate
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <Gem className={cn('w-4 h-4', accentClasses.gem)} />
                    <span className={cn('font-display text-lg leading-none', accentClasses.price)}>
                      {item.cost.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <button
                    disabled={!canAfford}
                    onClick={() => openConfirm(item)}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border text-[10.5px] font-display tracking-[0.2em] uppercase transition-all',
                      accentClasses.button,
                      !canAfford && 'cursor-not-allowed'
                    )}
                  >
                    {!canAfford && <Lock className="w-3 h-3" />}
                    {canAfford ? 'Resgatar' : 'Bloqueado'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto pb-10 px-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-1">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-xl border border-white/10 bg-[#0a0a0a] flex items-center justify-center hover:border-amber-500/50 transition"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-amber-400" />
            <h1 className="font-display text-2xl tracking-[0.3em] uppercase text-amber-400">LOJA</h1>
          </div>
          <div className="flex items-center gap-2 px-3 h-11 rounded-xl border border-sky-500/40 bg-[#0a0a0a]">
            <Gem className="w-4 h-4 text-sky-400" />
            <span className="font-display text-base text-sky-300">
              {streakState.total_fragments.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-7"
        >
          <div className="inline-flex items-center gap-2 mb-3 px-5 py-2 rounded-full border border-amber-500/60 bg-amber-500/5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-display tracking-[0.28em] uppercase text-amber-400">
              Recompensas Exclusivas
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Prove seu valor através da constância e resgate recompensas reais exclusivas.
          </p>
        </motion.div>

        {/* Recompensas Físicas Disponíveis */}
        {availablePhysicalItems.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Shirt className="w-5 h-5 text-amber-400" />
              <h2 className="font-display text-sm tracking-[0.28em] uppercase text-amber-400">
                Recompensas Físicas
              </h2>
            </div>
            <div className="space-y-3">{availablePhysicalItems.map(renderCard)}</div>
          </section>
        )}

        {/* Consumíveis */}
        {visibleConsumableItems.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Shield className="w-5 h-5 text-sky-400" />
              <h2 className="font-display text-sm tracking-[0.28em] uppercase text-sky-400">
                Consumíveis
              </h2>
            </div>
            <div className="space-y-3">{visibleConsumableItems.map(renderCard)}</div>
          </section>
        )}

        {/* Recompensas Resgatadas (Colapsado por padrão) */}
        {redeemedPhysicalItems.length > 0 && (
          <section className="mb-6">
            <button
              type="button"
              onClick={() => setShowRedeemed((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60 transition cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <Gift className="w-4.5 h-4.5 text-amber-400" />
                <span className="font-display text-xs tracking-[0.2em] uppercase text-zinc-300 font-semibold">
                  Recompensas Resgatadas ({redeemedPhysicalItems.length})
                </span>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-zinc-400 transition-transform duration-200',
                  showRedeemed && 'rotate-180'
                )}
              />
            </button>

            <AnimatePresence>
              {showRedeemed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3 pt-3"
                >
                  {redeemedPhysicalItems.map(renderCard)}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {streakState.streak_shields > 0 && (
          <p className="mt-4 text-center text-xs text-sky-300/80 font-display tracking-wider">
            🛡️ Você possui {streakState.streak_shields} {streakState.streak_shields === 1 ? 'escudo' : 'escudos'} de constância no inventário
          </p>
        )}
      </div>

      <AnimatePresence>
        {confirmItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={closeDialog}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'relative w-full max-w-sm rounded-2xl border bg-[#0a0a0a] p-6 text-center',
                successItem ? 'border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.35)]' : 'border-white/15'
              )}
            >
              <button
                onClick={closeDialog}
                className="absolute top-3 right-3 w-8 h-8 rounded-full border border-white/10 bg-black/60 flex items-center justify-center hover:border-white/30 transition"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {successItem ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full border border-amber-500/60 bg-amber-500/10 flex items-center justify-center mb-4">
                    <Gift className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="font-display text-lg tracking-[0.25em] uppercase text-amber-400 mb-2">
                    Muito bem, guerreiro!
                  </h3>
                  <p className="text-sm text-foreground/90 font-medium mb-3">
                    Poucos chegam até aqui, mas você já provou seu valor.
                  </p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                    Tire um print dessa tela e entre em contato com o mestre da Guilda através da nossa comunidade para resgatar sua recompensa.
                  </p>
                  <button
                    onClick={closeDialog}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-md border border-amber-500/70 bg-amber-500 text-black text-xs font-display tracking-[0.25em] uppercase hover:bg-amber-400 transition font-semibold"
                  >
                    Entendi
                  </button>
                </>
              ) : (
                <>
                  <div className="mx-auto w-14 h-14 rounded-xl border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center mb-4">
                    <img src={confirmItem.image_url} alt={confirmItem.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-display text-base tracking-[0.2em] uppercase text-foreground mb-2">
                    Confirmar resgate
                  </h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    Resgatar <span className="text-foreground font-medium">{confirmItem.name}</span>?
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mb-5">
                    <Gem className="w-4 h-4 text-sky-400" />
                    <span className="font-display text-lg text-sky-300">
                      {confirmItem.cost.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider ml-1">fragmentos</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={closeDialog}
                      disabled={isSubmitting}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-md border border-white/15 bg-black/60 text-xs font-display tracking-[0.2em] uppercase text-muted-foreground hover:border-white/30 transition disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmPurchase}
                      disabled={isSubmitting}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-md border text-xs font-display tracking-[0.2em] uppercase transition disabled:opacity-50',
                        confirmItem.accent === 'gold'
                          ? 'border-amber-500/70 bg-amber-500 text-black hover:bg-amber-400 font-semibold'
                          : 'border-sky-500/70 bg-sky-500 text-black hover:bg-sky-400 font-semibold'
                      )}
                    >
                      {isSubmitting ? 'Processando...' : 'Confirmar'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Modal de Detalhes do Resgate para itens já resgatados */}
        {detailsItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setDetailsItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-amber-500/60 bg-[#0a0a0a] p-6 text-center shadow-[0_0_40px_rgba(245,158,11,0.35)]"
            >
              <button
                onClick={() => setDetailsItem(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full border border-white/10 bg-black/60 flex items-center justify-center hover:border-white/30 transition"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="mx-auto w-20 h-20 rounded-xl border border-amber-500/50 bg-black/60 overflow-hidden flex items-center justify-center mb-3">
                <img
                  src={detailsItem.image_url}
                  alt={detailsItem.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <h3 className="font-display text-lg tracking-[0.25em] uppercase text-amber-400 mb-1">
                {detailsItem.name}
              </h3>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-[11px] font-display uppercase tracking-wider text-amber-300 mb-4">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Resgatado em:{' '}
                  {redemptionsMap.get(detailsItem.id)?.created_at
                    ? new Date(
                        redemptionsMap.get(detailsItem.id)!.created_at
                      ).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Data não registrada'}
                </span>
              </div>

              <p className="text-sm text-foreground/90 font-medium mb-2">
                Muito bem, guerreiro!
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
                Tire um print dessa tela e entre em contato com o mestre da Guilda através da nossa comunidade para resgatar sua recompensa.
              </p>

              <button
                onClick={() => setDetailsItem(null)}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-md border border-amber-500/70 bg-amber-500 text-black text-xs font-display tracking-[0.25em] uppercase hover:bg-amber-400 transition font-semibold"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
