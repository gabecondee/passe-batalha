-- =====================================================================================
-- PASSE DE BATALHA - DATABASE SCHEMA
-- Save Location: c:\Users\games\Downloads\passe-batalha\supabase\schema.sql
-- =====================================================================================

-- 1. PROFILES & USER ECONOMY
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    avatar TEXT,
    avatar_url TEXT,
    class TEXT,
    main_area TEXT,
    birth_date DATE,
    weight NUMERIC,
    height NUMERIC,
    gender TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    last_seen_level INTEGER DEFAULT 1,
    energy INTEGER DEFAULT 100,
    total_xp INTEGER DEFAULT 0,
    xp_physical INTEGER DEFAULT 0,
    xp_mental INTEGER DEFAULT 0,
    xp_spiritual INTEGER DEFAULT 0,
    xp_professional INTEGER DEFAULT 0,
    xp_financial INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Authenticated users can view public profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.user_economy (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    streak_days INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_fragments INTEGER DEFAULT 0,
    streak_shields INTEGER DEFAULT 0,
    last_checkin_date DATE
);

ALTER TABLE public.user_economy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own economy" ON public.user_economy FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own economy" ON public.user_economy FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_attributes (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    initial_xp JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own attributes" ON public.user_attributes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own attributes" ON public.user_attributes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own attributes" ON public.user_attributes FOR UPDATE USING (auth.uid() = user_id);

-- 2. BOSSES MODULE
CREATE TABLE IF NOT EXISTS public.custom_bosses (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class TEXT,
    portrait TEXT,
    description TEXT,
    origin TEXT,
    vice TEXT,
    difficulty TEXT NOT NULL DEFAULT 'rare',
    attribute_area TEXT NOT NULL DEFAULT 'Mental',
    is_system BOOLEAN NOT NULL DEFAULT false,
    xp_reward INTEGER NOT NULL DEFAULT 300,
    penalty_xp INTEGER NOT NULL DEFAULT 100,
    max_fails INTEGER NOT NULL DEFAULT 3,
    duration_days INTEGER NOT NULL DEFAULT 30,
    rules JSONB,
    abilities JSONB,
    weaknesses JSONB,
    daily_tasks JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custom_bosses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system or own custom bosses"
ON public.custom_bosses FOR SELECT TO authenticated
USING (is_system = true OR user_id = auth.uid());

CREATE POLICY "Users can insert own custom bosses"
ON public.custom_bosses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (is_system = false OR is_system IS NULL));

CREATE POLICY "Users can update own custom bosses"
ON public.custom_bosses FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND (is_system = false OR is_system IS NULL))
WITH CHECK (auth.uid() = user_id AND (is_system = false OR is_system IS NULL));

CREATE POLICY "Users can delete own custom bosses"
ON public.custom_bosses FOR DELETE TO authenticated
USING (auth.uid() = user_id AND (is_system = false OR is_system IS NULL));

CREATE TABLE IF NOT EXISTS public.boss_battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    boss_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ,
    duration_days INTEGER DEFAULT 30,
    days_history JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.boss_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own boss battles" ON public.boss_battles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own boss battles" ON public.boss_battles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own boss battles" ON public.boss_battles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own boss battles" ON public.boss_battles FOR DELETE USING (auth.uid() = user_id);

-- 3. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES ('boss-portraits', 'boss-portraits', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Boss Portraits" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Boss Portraits" ON storage.objects;

CREATE POLICY "Public Access Boss Portraits"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'boss-portraits');

CREATE POLICY "Authenticated Upload Boss Portraits"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'boss-portraits');

-- 4. SHOP MODULE
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

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view shop items" ON public.shop_items FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.user_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
    cost INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own redemptions" ON public.user_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own redemptions" ON public.user_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
