import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { useStreakReward } from '@/hooks/useStreakReward';
import { Gem, ShoppingCart, Shirt, Shield, Lock, ArrowLeft, Sparkles, Gift, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import coqueteleiraAsset from '@/assets/shop/coqueteleira.png.asset.json';
import canecaAsset from '@/assets/shop/caneca.png.asset.json';
import camisetaAsset from '@/assets/shop/camiseta.png.asset.json';
import bloqueioAsset from '@/assets/shop/bloqueio.png.asset.json';
import bloqueio2xAsset from '@/assets/shop/bloqueio-2x.png.asset.json';

type ShopCategory = 'physical' | 'consumable';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: ShopCategory;
  categoryLabel: string;
  image: string;
  shieldDays?: number;
  badge?: string;
  accent: 'gold' | 'blue';
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'shaker-ascensao',
    name: 'Coqueteleira da Ascensão',
    description: 'Criada para aqueles que seguem evoluindo, mesmo nos dias difíceis.',
    cost: 3000,
    category: 'physical',
    categoryLabel: 'Recompensa Física',
    image: coqueteleiraAsset.url,
    accent: 'gold',
  },
  {
    id: 'calice-constancia',
    name: 'Cálice da Constância',
    description: 'Toda grande transformação é construída dia após dia.',
    cost: 5000,
    category: 'physical',
    categoryLabel: 'Recompensa Física',
    image: canecaAsset.url,
    accent: 'gold',
  },
  {
    id: 'manto-reconstrutor',
    name: 'Manto do Reconstrutor',
    description: 'Não é apenas uma camiseta. É a prova de meses de batalha invisível.',
    cost: 9000,
    category: 'physical',
    categoryLabel: 'Recompensa Física',
    image: camisetaAsset.url,
    accent: 'gold',
  },
  {
    id: 'streak-shield-1',
    name: 'Bloqueio de Constância',
    description: 'Protege sua ofensiva por 1 dia caso você esqueça de realizar seu check diário.',
    cost: 400,
    category: 'consumable',
    categoryLabel: 'Consumível',
    image: bloqueioAsset.url,
    shieldDays: 1,
    accent: 'blue',
  },
  {
    id: 'streak-shield-2',
    name: 'Bloqueio de Constância X2',
    description: 'Dois escudos de proteção para manter sua sequência viva.',
    cost: 700,
    category: 'consumable',
    categoryLabel: 'Consumível',
    image: bloqueio2xAsset.url,
    shieldDays: 2,
    accent: 'blue',
  },
];

export default function Shop() {
  const navigate = useNavigate();
  const { state, purchase } = useStreakReward();
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [successItem, setSuccessItem] = useState<ShopItem | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<ShopCategory, ShopItem[]> = { physical: [], consumable: [] };
    SHOP_ITEMS.forEach((i) => groups[i.category].push(i));
    return groups;
  }, []);

  const openConfirm = (item: ShopItem) => {
    if (state.total_fragments < item.cost) return;
    setConfirmItem(item);
  };

  const confirmPurchase = () => {
    const item = confirmItem;
    if (!item) return;
    const ok = purchase({ id: item.id, name: item.name, cost: item.cost, shieldDays: item.shieldDays });
    if (!ok) {
      toast.error('Fragmentos insuficientes.');
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
  };

  const closeDialog = () => {
    setConfirmItem(null);
    setSuccessItem(null);
  };

  const isPhysicalRedeemed = (item: ShopItem) =>
    item.category === 'physical' && state.shop_purchases.some((p) => p.itemId === item.id);

  const renderCard = (item: ShopItem, idx: number) => {
    const canAfford = state.total_fragments >= item.cost;
    const isGold = item.accent === 'gold';
    const redeemed = isPhysicalRedeemed(item);
    const accentClasses = isGold
      ? {
          border: redeemed
            ? 'border-zinc-600/40 hover:border-zinc-500/60'
            : 'border-amber-500/40 hover:border-amber-400/70',
          glow: redeemed ? '' : 'hover:shadow-[0_0_24px_rgba(245,158,11,0.25)]',
          tag: 'border-amber-500/60 bg-black/70 text-amber-400',
          gem: 'text-amber-400',
          price: 'text-amber-400',
          badge: 'border-amber-400/70 bg-black/70 text-amber-300',
          imgFrame: redeemed
            ? 'border-zinc-600/50 bg-gradient-to-br from-black to-zinc-900/50'
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
          accentClasses.glow,
          redeemed && 'opacity-80'
        )}
      >
        <div className="flex items-stretch gap-3">
          {/* Image */}
          <div className="relative shrink-0">
            <div
              className={cn(
                'w-[110px] h-[110px] rounded-xl border overflow-hidden flex items-center justify-center',
                accentClasses.imgFrame
              )}
            >
              <img
                src={item.image}
                alt={item.name}
                className={cn('w-full h-full object-contain', redeemed && 'grayscale brightness-75')}
              />
              <div
                className={cn(
                  'absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full border flex items-center justify-center',
                  redeemed ? 'bg-zinc-800/90 border-zinc-600' : 'bg-black/80 border-white/10'
                )}
              >
                <Lock className={cn('w-3 h-3', redeemed ? 'text-zinc-400' : 'text-muted-foreground')} />
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
                <div className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border border-zinc-600/60 bg-zinc-900/50 text-[10.5px] font-display tracking-[0.15em] uppercase text-zinc-400">
                  <Lock className="w-3 h-3" />
                  Item já resgatado!
                </div>
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
              {state.total_fragments.toLocaleString('pt-BR')}
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

        {/* Physical Rewards */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Shirt className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-sm tracking-[0.28em] uppercase text-amber-400">
              Recompensas Físicas
            </h2>
          </div>
          <div className="space-y-3">{grouped.physical.map(renderCard)}</div>
        </section>

        {/* Consumables */}
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Shield className="w-5 h-5 text-sky-400" />
            <h2 className="font-display text-sm tracking-[0.28em] uppercase text-sky-400">
              Consumíveis
            </h2>
          </div>
          <div className="space-y-3">{grouped.consumable.map(renderCard)}</div>
        </section>

        {state.streak_shields > 0 && (
          <p className="mt-4 text-center text-xs text-sky-300/80 font-display tracking-wider">
            🛡️ Você possui {state.streak_shields} {state.streak_shields === 1 ? 'escudo' : 'escudos'} de constância no inventário
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
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-md border border-amber-500/70 bg-amber-500 text-black text-xs font-display tracking-[0.25em] uppercase hover:bg-amber-400 transition"
                  >
                    Entendi
                  </button>
                </>
              ) : (
                <>
                  <div className="mx-auto w-14 h-14 rounded-xl border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center mb-4">
                    <img src={confirmItem.image} alt={confirmItem.name} className="w-full h-full object-contain" />
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
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-md border border-white/15 bg-black/60 text-xs font-display tracking-[0.2em] uppercase text-muted-foreground hover:border-white/30 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmPurchase}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-md border text-xs font-display tracking-[0.2em] uppercase transition',
                        confirmItem.accent === 'gold'
                          ? 'border-amber-500/70 bg-amber-500 text-black hover:bg-amber-400'
                          : 'border-sky-500/70 bg-sky-500 text-black hover:bg-sky-400'
                      )}
                    >
                      Confirmar
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
