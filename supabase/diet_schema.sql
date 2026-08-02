-- Tabela de Planos de Dieta
CREATE TABLE public.diet_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gender TEXT,
    age INTEGER,
    height INTEGER,
    weight NUMERIC,
    activity TEXT,
    goal TEXT,
    kcal_target INTEGER,
    protein_target INTEGER,
    carbs_target INTEGER,
    fat_target INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Refeições
CREATE TABLE public.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    meal_time TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Alimentos
CREATE TABLE public.foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
    name TEXT,
    quantity NUMERIC,
    kcal INTEGER,
    carbs NUMERIC,
    protein NUMERIC,
    fat NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view their own diet plans" ON public.diet_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own diet plans" ON public.diet_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diet plans" ON public.diet_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diet plans" ON public.diet_plans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own meals" ON public.meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meals" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meals" ON public.meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meals" ON public.meals FOR DELETE USING (auth.uid() = user_id);

-- Para foods, podemos usar a mesma regra baseada no meal_id usando subqueries, 
-- MAS, por simplicidade e performance, como os inserts partem do client autenticado, 
-- podemos adicionar user_id em foods ou simplesmente basear-se no relacionamento da meal.
-- Adicionando user_id em foods pra facilitar o RLS puro sem joins custosos:
ALTER TABLE public.foods ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Users can view their own foods" ON public.foods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own foods" ON public.foods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own foods" ON public.foods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own foods" ON public.foods FOR DELETE USING (auth.uid() = user_id);
