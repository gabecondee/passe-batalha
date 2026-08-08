-- Migration: Create shop_items and user_redemptions tables
-- File: supabase/migrations/20260808_shop_items.sql

-- 1. Create shop_items table
CREATE TABLE IF NOT EXISTS public.shop_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cost INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN ('physical', 'consumable')),
    image_url TEXT NOT NULL,
    shield_days INTEGER DEFAULT 0,
    accent TEXT DEFAULT 'gold',
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on shop_items
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Authenticated users can view shop items"
ON public.shop_items FOR SELECT
TO authenticated
USING (true);

-- 2. Create user_redemptions table
CREATE TABLE IF NOT EXISTS public.user_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
    cost INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_redemptions
ALTER TABLE public.user_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies for user_redemptions
CREATE POLICY "Users can view their own redemptions"
ON public.user_redemptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own redemptions"
ON public.user_redemptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Seed initial shop items
INSERT INTO public.shop_items (id, name, description, cost, category, image_url, shield_days, accent, status)
VALUES 
    ('shaker-ascensao', 'Coqueteleira da Ascensão', 'Criada para aqueles que seguem evoluindo, mesmo nos dias difíceis.', 3000, 'physical', '/images/shop/coqueteleira_da_ascensao.jpeg', 0, 'gold', true),
    ('calice-constancia', 'Cálice da Constância', 'Toda grande transformação é construída dia após dia.', 5000, 'physical', '/images/shop/calice_da_constancia.jpeg', 0, 'gold', true),
    ('manto-reconstrutor', 'Manto do Reconstrutor', 'Não é apenas uma camiseta. É a prova de meses de batalha invisível.', 9000, 'physical', '/images/shop/manto_do_construtor.jpeg', 0, 'gold', true),
    ('streak-shield-1', 'Bloqueio de Constância', 'Protege sua ofensiva por 1 dia caso você esqueça de realizar seu check diário.', 400, 'consumable', '/images/shop/bloqueio_constancia_1x.png', 1, 'blue', true),
    ('streak-shield-2', 'Bloqueio de Constância X2', 'Dois escudos de proteção para manter sua sequência viva.', 700, 'consumable', '/images/shop/bloqueio_constancia_2x.png', 2, 'blue', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cost = EXCLUDED.cost,
    category = EXCLUDED.category,
    image_url = EXCLUDED.image_url,
    shield_days = EXCLUDED.shield_days,
    accent = EXCLUDED.accent,
    status = EXCLUDED.status;
