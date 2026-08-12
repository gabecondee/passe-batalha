import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Apple,
  Plus,
  ChevronRight,
  UtensilsCrossed,
  Target,
  Weight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MainLayout } from '@/components/layout/MainLayout';
import { DietPlanDialog, DietPlan } from '@/components/diet/DietPlanDialog';
import { MealDialog } from '@/components/diet/MealDialog';
import { useMeals, sumMeal } from '@/hooks/useMeals';
import { getMealIcon } from '@/lib/mealIcon';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { emit } from '@/lib/eventBus';

const MACRO_COLORS = {
  carbs: 'hsl(210 90% 60%)', // blue
  protein: 'hsl(140 70% 50%)', // green
  fat: 'hsl(280 70% 62%)', // purple
};

interface NutritionTargets {
  kcal: number;
  protein: { g: number; pct: number };
  fat: { g: number; pct: number };
  carbs: { g: number; pct: number };
}

function computeTargets(
  plan: DietPlan,
  overrideWeight?: number,
  overrideHeight?: number,
  overrideAge?: number,
): NutritionTargets {
  const weight = overrideWeight ?? plan.weight;
  const height = overrideHeight ?? plan.height;
  const age = overrideAge ?? plan.age;

  const bmr =
    plan.gender === 'homem'
      ? 88.36 + 13.4 * weight + 4.8 * height - 5.7 * age
      : 447.6 + 9.2 * weight + 3.1 * height - 4.3 * age;
  const factor = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725 }[plan.activity];
  let kcal = bmr * factor;
  if (plan.goal === 'ganhar') kcal += 300;
  if (plan.goal === 'perder') kcal -= 300;
  kcal = Math.round(kcal);

  const proteinG = Math.round(weight * 2);
  const fatG = Math.round(weight * 1);
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsKcal = Math.max(0, kcal - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);

  const totalKcal = kcal || 1;
  return {
    kcal,
    protein: { g: proteinG, pct: Math.round((proteinKcal / totalKcal) * 100) },
    fat: { g: fatG, pct: Math.round((fatKcal / totalKcal) * 100) },
    carbs: { g: carbsG, pct: Math.round((carbsKcal / totalKcal) * 100) },
  };
}

const goalLabel: Record<DietPlan['goal'], string> = {
  perder: 'Perder peso',
  ganhar: 'Ganhar massa',
  manutencao: 'Manutenção',
};

export default function Diet() {
  const { user } = useAuth();
  const { user: gameUser } = useGame();
  const navigate = useNavigate();
  const { meals, addMeal } = useMeals();
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [mealDialog, setMealDialog] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPlan = async () => {
      const { data, error } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setPlan({
          gender: data.gender as any,
          age: data.age,
          height: data.height,
          weight: Number(data.weight),
          activity: data.activity as any,
          goal: data.goal as any,
        });
      }
    };
    fetchPlan();
  }, [user]);

  const handleGenerate = async (p: DietPlan) => {
    setPlan(p);
    
    if (user) {
      const computed = computeTargets(p);
      await supabase.from('diet_plans').insert({
        user_id: user.id,
        gender: p.gender,
        age: p.age,
        height: p.height,
        weight: p.weight,
        activity: p.activity,
        goal: p.goal,
        kcal_target: computed.kcal,
        protein_target: computed.protein.g,
        carbs_target: computed.carbs.g,
        fat_target: computed.fat.g
      });
      emit({ type: 'diet:plan-created' });
    }
  };

  const currentWeight = gameUser?.weight ?? plan?.weight;
  const currentHeight = gameUser?.height ?? plan?.height;
  const currentAge = useMemo(() => {
    if (!gameUser?.birthDate) return plan?.age;
    const cleanDate = gameUser.birthDate.slice(0, 10);
    const today = new Date();
    const birth = new Date(cleanDate + 'T00:00:00');
    if (isNaN(birth.getTime())) return plan?.age;
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a >= 0 ? a : plan?.age;
  }, [gameUser?.birthDate, plan?.age]);

  const targets = useMemo(
    () => (plan ? computeTargets(plan, currentWeight, currentHeight, currentAge) : null),
    [plan, currentWeight, currentHeight, currentAge],
  );

  const consumed = useMemo(
    () =>
      meals.reduce(
        (acc, m) => {
          const s = sumMeal(m);
          return {
            kcal: acc.kcal + s.kcal,
            carbs: acc.carbs + s.carbs,
            protein: acc.protein + s.protein,
            fat: acc.fat + s.fat,
          };
        },
        { kcal: 0, carbs: 0, protein: 0, fat: 0 },
      ),
    [meals],
  );

  // Pie chart data: proportional macro breakdown by kcal contribution
  const macroKcal = {
    carbs: consumed.carbs * 4,
    protein: consumed.protein * 4,
    fat: consumed.fat * 9,
  };
  const totalMacroKcal = macroKcal.carbs + macroKcal.protein + macroKcal.fat;

  const chartData =
    totalMacroKcal > 0
      ? [
          { name: 'Carboidratos', value: macroKcal.carbs, color: MACRO_COLORS.carbs },
          { name: 'Proteínas', value: macroKcal.protein, color: MACRO_COLORS.protein },
          { name: 'Gorduras', value: macroKcal.fat, color: MACRO_COLORS.fat },
        ].filter((d) => d.value > 0)
      : [{ name: 'empty', value: 1, color: 'hsl(0 0% 15%)' }];

  const handleCreateMeal = async (name: string, time: string) => {
    const id = await addMeal(name, time);
    navigate(`/diet/meal/${id}`);
  };

  const macroRows = [
    { key: 'carbs' as const, label: 'Carboidratos', color: MACRO_COLORS.carbs, data: targets?.carbs },
    { key: 'protein' as const, label: 'Proteínas', color: MACRO_COLORS.protein, data: targets?.protein },
    { key: 'fat' as const, label: 'Gorduras', color: MACRO_COLORS.fat, data: targets?.fat },
  ];

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-2xl space-y-8 pb-10">
        {/* Back button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory')}
            className="w-11 h-11 rounded-xl border border-border/60 bg-card/60 flex items-center justify-center text-foreground backdrop-blur transition hover:border-primary/50"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-muted-foreground">Voltar</span>
        </div>

        {/* Title + description (centered) */}
        <div className="mt-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Apple className="w-8 h-8 text-primary" />
            <h1 className="font-display text-3xl md:text-4xl tracking-[0.2em] uppercase text-primary">
              Dieta
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Este é seu painel nutricional. Monitore sua
            <br />
            alimentação e gestão de macronutrientes.
          </p>
        </div>


        {/* Consumo de Hoje Card */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-5 shadow-[0_0_28px_hsl(var(--primary)/0.1)] backdrop-blur-xl md:p-8"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

          <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Consumo de Hoje
          </p>

          {/* Chart */}
          <div className="relative mx-auto mt-6 h-64 w-64 md:h-72 md:w-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius="78%"
                  outerRadius="100%"
                  paddingAngle={totalMacroKcal > 0 && chartData.length > 1 ? 2 : 0}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-5xl font-bold text-foreground md:text-6xl">
                {Math.round(consumed.kcal).toLocaleString('pt-BR')}
              </span>
              <span className="mt-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                kcal consumidas
              </span>
              {targets && (
                <span className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  de {targets.kcal.toLocaleString('pt-BR')} kcal
                </span>
              )}
            </div>
          </div>

          {/* Meta Diária */}
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Meta Diária
            </p>
            <div className="space-y-2.5">
              {macroRows.map((m) => {
                const cur = Math.round(consumed[m.key]);
                return (
                  <div
                    key={m.label}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 px-4 py-3.5 backdrop-blur"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full border"
                        style={{
                          borderColor: m.color,
                          boxShadow: `0 0 12px ${m.color}55`,
                        }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                      </span>
                      <span className="text-base font-semibold text-foreground">{m.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1 font-display text-base font-bold" style={{ color: m.color }}>
                      <span>{cur}g</span>
                      <span className="text-muted-foreground/60">/</span>
                      <span className="text-muted-foreground/80">{m.data ? `${m.data.g}g` : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Objetivo / Peso */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {[
              { icon: Target, label: 'Objetivo', value: plan ? goalLabel[plan.goal] : '—' },
              { icon: Weight, label: 'Peso atual', value: currentWeight ? `${currentWeight}kg` : '—' },
            ].map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3.5 backdrop-blur"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary">
                  <c.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                    {c.label}
                  </p>
                  <p className="mt-0.5 truncate font-display text-sm text-foreground">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Botão Novo Plano */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setPlanDialog(true)}
            className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-primary bg-primary/5 py-4 font-display text-sm font-bold uppercase tracking-widest text-primary shadow-[0_0_20px_hsl(var(--primary)/0.25)] transition hover:bg-primary/10 hover:shadow-[0_0_30px_hsl(var(--primary)/0.45)]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            {plan ? 'Atualizar Plano de Dieta' : 'Novo Plano de Dieta'}
          </motion.button>
        </motion.section>

        {/* Plano Atual */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-border/60 bg-card/70 p-5 backdrop-blur-xl md:p-7"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Plano Atual
          </p>

          {meals.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-background/30 px-6 py-10 text-center">
              <Apple className="mb-4 h-14 w-14 text-muted-foreground/50" strokeWidth={1.5} />
              <p className="font-display text-base uppercase tracking-widest text-muted-foreground">
                Nenhum plano ativo
              </p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground/70">
                Crie seu primeiro plano de dieta para começar sua jornada de evolução.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {meals.map((meal, i) => {
                  const totals = sumMeal(meal);
                  const Icon = getMealIcon(meal.name);
                  return (
                    <motion.button
                      key={meal.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: 0.03 * i }}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => navigate(`/diet/meal/${meal.id}`)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-3.5 text-left backdrop-blur transition hover:border-primary/50 hover:shadow-[0_0_18px_hsl(var(--primary)/0.25)]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm uppercase tracking-wider text-foreground">
                          {meal.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {meal.time
                            ? `Horário: ${meal.time}`
                            : `${meal.foods.length} ${meal.foods.length === 1 ? 'item' : 'itens'}`}
                        </p>
                      </div>
                      <div className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                        {Math.round(totals.kcal)} kcal
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setMealDialog(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 py-3.5 font-display text-sm uppercase tracking-widest text-primary transition hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
            Adicionar refeição
          </motion.button>
        </motion.section>
      </div>

      <DietPlanDialog
        open={planDialog}
        onOpenChange={setPlanDialog}
        onGenerate={handleGenerate}
        initial={plan ?? undefined}
      />

      <MealDialog open={mealDialog} onOpenChange={setMealDialog} onSave={handleCreateMeal} />
    </MainLayout>
  );
}
