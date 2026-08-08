import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStreakReward } from '@/hooks/useStreakReward';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: 'physical' | 'consumable';
  image_url: string;
  shield_days: number;
  accent: 'gold' | 'blue';
  status: boolean; // true = ativo (resgatavel), false = inativo
}

export interface UserRedemption {
  id: string;
  user_id: string;
  item_id: string;
  cost: number;
  created_at: string;
}

export function useShop() {
  const { user } = useAuth();
  const { state: economyState } = useStreakReward();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [redemptions, setRedemptions] = useState<UserRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchShopData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all shop items from database
      const { data: itemsData, error: itemsErr } = await supabase
        .from('shop_items')
        .select('*')
        .order('cost', { ascending: true });

      if (!itemsErr && itemsData) {
        setItems(
          itemsData.map((d: any) => ({
            id: d.id,
            name: d.name,
            description: d.description || '',
            cost: Number(d.cost) || 0,
            category: d.category as 'physical' | 'consumable',
            image_url: d.image_url,
            shield_days: Number(d.shield_days) || 0,
            accent: (d.accent as 'gold' | 'blue') || (d.category === 'physical' ? 'gold' : 'blue'),
            status: Boolean(d.status),
          }))
        );
      }

      // 2. Fetch user redemptions if user is logged in
      if (user) {
        const { data: redData } = await supabase
          .from('user_redemptions')
          .select('*')
          .eq('user_id', user.id);

        if (redData) {
          setRedemptions(redData);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados da loja:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  const redeemedItemIds = useMemo(() => {
    return new Set(redemptions.map((r) => r.item_id));
  }, [redemptions]);

  const redemptionsMap = useMemo(() => {
    const map = new Map<string, UserRedemption>();
    // Sort so the latest redemption is retrieved if multiple exist
    redemptions.forEach((r) => map.set(r.item_id, r));
    return map;
  }, [redemptions]);

  // Visible physical items: status === true OR user already redeemed it
  const visiblePhysicalItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.category === 'physical' &&
        (item.status === true || redeemedItemIds.has(item.id))
    );
  }, [items, redeemedItemIds]);

  // Visible consumable items: status === true OR user already redeemed it
  const visibleConsumableItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.category === 'consumable' &&
        (item.status === true || redeemedItemIds.has(item.id))
    );
  }, [items, redeemedItemIds]);

  // Function to redeem an item
  const redeemItem = useCallback(
    async (item: ShopItem): Promise<{ success: boolean; message?: string }> => {
      if (!user) return { success: false, message: 'Usuário não autenticado.' };

      // 1. Check if user has enough fragments
      if (economyState.total_fragments < item.cost) {
        return { success: false, message: 'Fragmentos insuficientes.' };
      }

      // 2. Physical item rule: can ONLY be redeemed 1 time strictly!
      if (item.category === 'physical' && redeemedItemIds.has(item.id)) {
        return { success: false, message: 'Recompensa física já resgatada!' };
      }

      // 3. Status check: if inactive and user hasn't redeemed it, cannot redeem!
      if (!item.status && !redeemedItemIds.has(item.id)) {
        return { success: false, message: 'Item indisponível no momento.' };
      }

      const newFragments = economyState.total_fragments - item.cost;
      const newShields = economyState.streak_shields + (item.shield_days || 0);

      // 4. Insert redemption in DB
      const { data: insertedRedemption, error: redErr } = await supabase
        .from('user_redemptions')
        .insert({
          user_id: user.id,
          item_id: item.id,
          cost: item.cost,
        })
        .select()
        .single();

      if (redErr) {
        console.error('Erro ao registrar resgate:', redErr);
        return { success: false, message: 'Erro ao registrar resgate no banco.' };
      }

      // 5. Update user_economy in DB
      const { error: econErr } = await supabase
        .from('user_economy')
        .update({
          total_fragments: newFragments,
          streak_shields: newShields,
        })
        .eq('user_id', user.id);

      if (econErr) {
        console.error('Erro ao atualizar saldo de fragmentos:', econErr);
      }

      // 6. Update local state & dispatch global sync
      setRedemptions((prev) => [...prev, insertedRedemption]);
      window.dispatchEvent(new CustomEvent('streak-reward:sync'));

      return { success: true };
    },
    [user, economyState, redeemedItemIds]
  );

  return {
    items,
    visiblePhysicalItems,
    visibleConsumableItems,
    redeemedItemIds,
    redemptionsMap,
    redemptions,
    redeemItem,
    isLoading,
    refetch: fetchShopData,
  };
}
