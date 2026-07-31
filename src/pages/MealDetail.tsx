import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useMeals, sumMeal } from '@/hooks/useMeals';
import { MealDialog } from '@/components/diet/MealDialog';
import { FoodDialog, FoodEntry } from '@/components/diet/FoodDialog';
import { getMealIcon } from '@/lib/mealIcon';

export default function MealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { meals, renameMeal, deleteMeal, addFood, updateFood, deleteFood } = useMeals();

  const meal = useMemo(() => meals.find((m) => m.id === id), [meals, id]);

  const [renameOpen, setRenameOpen] = useState(false);
  const [foodOpen, setFoodOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodEntry | undefined>();

  if (!meal) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">Refeição não encontrada.</p>
          <Button onClick={() => navigate('/diet')} variant="outline">
            Voltar para Dieta
          </Button>
        </div>
      </MainLayout>
    );
  }

  const totals = sumMeal(meal);

  const handleSaveFood = (data: Omit<FoodEntry, 'id'>) => {
    if (editingFood) updateFood(meal.id, editingFood.id, data);
    else addFood(meal.id, data);
  };

  const stats = [
    { label: 'Calorias', value: `${Math.round(totals.kcal)} kcal` },
    { label: 'Carboidratos', value: `${totals.carbs.toFixed(1).replace('.', ',')} g` },
    { label: 'Proteína', value: `${totals.protein.toFixed(1).replace('.', ',')} g` },
    { label: 'Gordura', value: `${totals.fat.toFixed(1).replace('.', ',')} g` },
  ];

  return (
    <MainLayout>
      <div className="space-y-5 pb-10 pt-6 md:pt-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/diet')}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 pt-8 text-center">
            <h1 className="font-display text-lg uppercase tracking-widest text-foreground">
              {meal.name}
            </h1>
            {meal.time && (
              <p className="mt-0.5 text-xs text-muted-foreground">Horário: {meal.time}</p>
            )}
          </div>
          <button
            onClick={() => setRenameOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:text-primary"
            aria-label="Editar"
          >
            <Pencil className="h-5 w-5" />
          </button>
        </div>

        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/25 via-accent/15 to-primary/10 shadow-[0_0_30px_hsl(var(--primary)/0.25)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,hsl(var(--primary)/0.25),transparent_60%)]" />
          {(() => {
            const Icon = getMealIcon(meal.name);
            return <Icon className="h-20 w-20 text-primary/90 drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]" />;
          })()}
        </motion.div>

        {/* Nutrition grid 2x2 */}
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur">
          <div className="grid grid-cols-2 divide-x divide-y divide-border/50">
            {stats.map((s, i) => (
              <div key={s.label} className={`p-5 text-center ${i < 2 ? 'border-t-0' : ''}`}>
                <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Foods list */}
        <div className="space-y-2">
          {meal.foods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum alimento registrado</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur">
              {meal.foods
                .slice()
                .map((f) => (
                  <li key={f.id} className="group">
                    <button
                      onClick={() => {
                        setEditingFood(f);
                        setFoodOpen(true);
                      }}
                      className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-primary/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base text-foreground">{f.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {f.quantity || '—'}
                        </p>
                      </div>
                      <span className="font-display text-base font-semibold text-foreground">
                        {Math.round(f.kcal)} kcal
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* Add food */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            setEditingFood(undefined);
            setFoodOpen(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 to-accent/15 py-4 font-display text-sm uppercase tracking-widest text-primary shadow-[0_0_18px_hsl(var(--primary)/0.25)] transition hover:shadow-[0_0_28px_hsl(var(--primary)/0.4)]"
        >
          <Plus className="h-4 w-4" />
          Registrar alimento
        </motion.button>

        {editingFood && (
          <button
            onClick={() => {
              deleteFood(meal.id, editingFood.id);
              setEditingFood(undefined);
            }}
            className="hidden"
          />
        )}

        {/* Delete meal */}
        <button
          onClick={() => {
            deleteMeal(meal.id);
            navigate('/diet');
          }}
          className="mx-auto mt-4 flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          Excluir refeição
        </button>
      </div>

      <MealDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onSave={(name, time) => renameMeal(meal.id, name, time)}
        initialName={meal.name}
        initialTime={meal.time}
      />

      <FoodDialog
        open={foodOpen}
        onOpenChange={(o) => {
          setFoodOpen(o);
          if (!o) setEditingFood(undefined);
        }}
        onSave={handleSaveFood}
        initial={editingFood}
        onDelete={
          editingFood
            ? () => {
                deleteFood(meal.id, editingFood.id);
                setEditingFood(undefined);
                setFoodOpen(false);
              }
            : undefined
        }
      />
    </MainLayout>
  );
}
