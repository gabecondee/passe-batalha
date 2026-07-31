
-- Achievements definitions (seeded, not per-user)
CREATE TABLE public.achievements (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('streak', 'missions')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- User achievements (unlocked)
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id),
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- User streak tracking
CREATE TABLE public.user_streaks (
  user_id UUID PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Achievements are readable by everyone (they're definitions)
CREATE POLICY "Achievements are publicly readable" ON public.achievements FOR SELECT USING (true);

-- User achievements: users can read/insert their own
CREATE POLICY "Users can read own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User streaks: users can read/insert/update their own
CREATE POLICY "Users can read own streak" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streak" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streak" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Seed achievement definitions
INSERT INTO public.achievements (id, category, name, description, icon, threshold, sort_order) VALUES
  ('streak-7', 'streak', 'Primeira Semana', '7 dias consecutivos de atividade', '🔥', 7, 1),
  ('streak-30', 'streak', 'Guerreiro Mensal', '30 dias consecutivos de atividade', '⚡', 30, 2),
  ('streak-90', 'streak', 'Determinação de Ferro', '90 dias consecutivos de atividade', '🛡️', 90, 3),
  ('streak-180', 'streak', 'Meio Ano Imparável', '180 dias consecutivos de atividade', '💎', 180, 4),
  ('streak-365', 'streak', 'Lenda do Ano', '365 dias consecutivos de atividade', '👑', 365, 5),
  ('streak-730', 'streak', 'Mestre Bienal', '730 dias consecutivos de atividade', '🏆', 730, 6),
  ('streak-1000', 'streak', 'Imortal', '1000 dias consecutivos de atividade', '⭐', 1000, 7),
  ('missions-25', 'missions', 'Caçador de Missões', '25 missões completadas', '🎯', 25, 1),
  ('missions-100', 'missions', 'Centurião', '100 missões completadas', '⚔️', 100, 2),
  ('missions-250', 'missions', 'Veterano de Guerra', '250 missões completadas', '🗡️', 250, 3),
  ('missions-500', 'missions', 'Herói Lendário', '500 missões completadas', '🦁', 500, 4),
  ('missions-1000', 'missions', 'Conquistador Supremo', '1000 missões completadas', '🐉', 1000, 5),
  ('missions-2500', 'missions', 'Deus da Guerra', '2500 missões completadas', '🌟', 2500, 6);
