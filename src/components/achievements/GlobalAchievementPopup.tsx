import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, Star } from 'lucide-react';
import { useAchievementsData } from '@/hooks/useAchievementsData';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStreakReward } from '@/hooks/useStreakReward';
import { useBusEventType } from '@/lib/eventBus';
import { toISODate } from '@/lib/missionRewards';
import { supabase } from '@/integrations/supabase/client';
import { RARITY_META } from '@/data/achievementsData';
import { cn } from '@/lib/utils';

/**
 * Renders achievement unlock popups over ANY screen of the app,
 * except during login/onboarding flows.
 */
export function GlobalAchievementPopup() {
  const { popup, dismissPopup } = useAchievementsData();
  
  const { hasCompletedOnboarding } = useGame();
  const { user } = useAuth();
  const { state: streakState, isLoading: isStreakLoading } = useStreakReward();
  
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  useBusEventType('ui:checkin-toggled', (e) => setIsCheckinOpen(e.isOpen));

  const today = toISODate(new Date());
  const hasCheckedIn = streakState.last_checkin_date === today;

  // Ref para lock de clique duplo — não causa re-render e persiste durante animações
  const dismissLockRef = useRef(false);

  // IMPORTANTE: o lock precisa ser liberado assim que um NOVO popup aparece na tela,
  // não apenas quando a sincronização em background do popup ANTERIOR termina.
  // Antes, se duas conquistas fossem desbloqueadas na mesma ação (ex: completar uma
  // missão que bate o requisito de 2 conquistas ao mesmo tempo), o clique em
  // "Continuar Jornada" da segunda conquista era ignorado enquanto o sync da primeira
  // ainda estava em andamento (100–500ms) — parecendo que era preciso clicar 2 vezes.
  useEffect(() => {
    dismissLockRef.current = false;
  }, [popup?.id]);

  // Don't show popups during onboarding, or if the daily check-in hasn't been completed yet, or if it is currently open
  if (!hasCompletedOnboarding || isStreakLoading || !hasCheckedIn || isCheckinOpen) return null;

  const handleDismiss = () => {
    if (!popup || dismissLockRef.current) {
      return;
    }
    dismissLockRef.current = true;

    // 1. Captura o id antes de qualquer setState
    const achievementId = popup.id;

    // 2. Grava IMEDIATAMENTE no localStorage — fonte de verdade local
    //    Isso garante que o popup nunca reaparece neste browser,
    //    mesmo que o update no banco falhe ou não retorne linhas.
    if (user) {
      try {
        const storageKey = `local_notified_achievements_${user.id}`;
        const localNotified: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!localNotified.includes(achievementId)) {
          localStorage.setItem(storageKey, JSON.stringify([...localNotified, achievementId]));
        }
      } catch {}
    }

    // 3. Fecha o popup e marca como notified no estado local
    dismissPopup(achievementId, true);

    // 4. Sincroniza com o banco em segundo plano (best-effort)
    if (user) {
      supabase
        .from('user_achievements')
        .update({ notified: true })
        .eq('user_id', user.id)
        .eq('achievement_id', achievementId)
        .then(({ error }) => {
          if (error) {
            // Falha silenciosa — localStorage já garantiu que não reaparece
            console.warn('Falha ao sincronizar conquista no banco (não crítico):', error.message);
          }
          dismissLockRef.current = false;
        });
    } else {
      dismissLockRef.current = false;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {popup && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleDismiss}
        >
          <motion.div
            key={popup.id}
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative fantasy-card p-8 max-w-sm w-full text-center border-2',
              RARITY_META[popup.rarity].glowClass,
            )}
            style={{ borderColor: RARITY_META[popup.rarity].colorHex }}
          >
            <button onClick={handleDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                Conquista Desbloqueada
              </span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            <div className="my-4 flex justify-center">
              <div
                className={cn(
                  'w-24 h-24 rounded-full flex items-center justify-center ring-2',
                  RARITY_META[popup.rarity].ringClass,
                  RARITY_META[popup.rarity].glowClass,
                )}
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${RARITY_META[popup.rarity].colorHex}44, ${RARITY_META[popup.rarity].colorHex}11 70%, transparent)`,
                }}
              >
                <popup.icon
                  className="w-10 h-10"
                  style={{
                    color: RARITY_META[popup.rarity].colorHex,
                    filter: `drop-shadow(0 0 10px ${RARITY_META[popup.rarity].colorHex})`,
                  }}
                />
              </div>
            </div>

            <div className="flex justify-center gap-[3px] mb-3">
              {Array.from({ length: RARITY_META[popup.rarity].stars }).map((_, i) => (
                <Star
                  key={i}
                  className="w-3 h-3"
                  style={{
                    color: RARITY_META[popup.rarity].colorHex,
                    fill: RARITY_META[popup.rarity].colorHex,
                  }}
                />
              ))}
            </div>

            <h2 className="font-display text-2xl mb-1" style={{ color: RARITY_META[popup.rarity].colorHex }}>
              {popup.name}
            </h2>
            <div className={cn('text-xs font-bold uppercase tracking-widest mb-4', RARITY_META[popup.rarity].textClass)}>
              {RARITY_META[popup.rarity].label}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-amber-400 mb-1">
              Marco Atingido
            </div>
            <p className="text-sm text-foreground mb-3">{popup.milestone}</p>
            <p className="text-sm text-muted-foreground mb-5 italic">"{popup.phrase}"</p>

            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Recompensa</span>
                <span className="font-display text-lg text-amber-400">+{popup.xp} XP</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Área</span>
                <span className="font-display text-lg">{popup.area}</span>
              </div>
            </div>

            <button
                onClick={handleDismiss}
                className="mt-6 w-full py-2.5 rounded-lg font-semibold text-sm border-2 hover:brightness-125 transition"
              style={{
                borderColor: RARITY_META[popup.rarity].colorHex,
                color: RARITY_META[popup.rarity].colorHex,
                background: `${RARITY_META[popup.rarity].colorHex}15`,
              }}
            >
              Continuar Jornada
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
