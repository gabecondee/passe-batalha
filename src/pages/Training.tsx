import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Plus, Dumbbell, ChevronRight, ArrowLeft, Calendar, Ruler, Weight, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { TrainingPlanDialog, TrainingPlan, WeekDayKey } from '@/components/training/TrainingPlanDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useGame } from '@/contexts/GameContext';
import { toast } from '@/hooks/use-toast';
import { loadAllWorkouts, MUSCLES, MuscleId } from '@/lib/workoutStorage';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'training_plan_v1';

const DAY_LABELS: Record<WeekDayKey, string> = {
  D: 'Domingo',
  S1: 'Segunda',
  T: 'Terça',
  Q1: 'Quarta',
  Q2: 'Quinta',
  S2: 'Sexta',
  S3: 'Sábado',
};

const DAY_ORDER: WeekDayKey[] = ['S1', 'T', 'Q1', 'Q2', 'S2', 'S3', 'D'];

const MUSCLE_NAME: Record<MuscleId, string> = MUSCLES.reduce((acc, m) => {
  acc[m.id] = m.name;
  return acc;
}, {} as Record<MuscleId, string>);

export default function Training() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Record<string, { muscles: MuscleId[] }>>({});
  const { user } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPlan(JSON.parse(raw));
    } catch {
      // ignore
    }
    setWorkouts(loadAllWorkouts());
  }, []);

  const handleSave = (p: TrainingPlan) => {
    setPlan(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    toast({
      title: 'Plano salvo!',
      description: `${p.days.length} dia(s) de treino configurado(s).`,
    });
  };

  const handleDeletePlan = () => {
    setPlan(null);
    setWorkouts({});
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('training_day_workouts_v1');
    localStorage.removeItem('trainings_completed_days_v1');
    localStorage.removeItem('trainings_completed');
    setConfirmDeleteOpen(false);
    toast({ title: 'Plano excluído', description: 'Todas as informações de treino foram resetadas.' });
  };

  const sortedDays = plan?.days.slice().sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)) ?? [];

  const musclesForDay = (d: WeekDayKey): string => {
    const ids = workouts[d]?.muscles ?? [];
    if (ids.length === 0) return 'Vazio';
    return ids.map((id) => MUSCLE_NAME[id]).join(', ');
  };

  const toTitleCase = (s: string) =>
    s
      .toLowerCase()
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ');


  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back button */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-11 h-11 shrink-0 rounded-xl border-border/60 bg-card/60"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm text-muted-foreground">Voltar</span>
        </div>

        {/* Title + description (centered) */}
        <div className="mt-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Dumbbell className="w-8 h-8 text-primary" />
            <h1 className="font-display text-3xl md:text-4xl tracking-[0.2em] uppercase text-primary">
              Treino
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Monte, organize e acompanhe seus planos
            <br />
            de treino em um só lugar.
          </p>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-4 rounded-3xl border border-border/40 bg-card/40 p-4 md:p-5"
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-28 w-28 md:h-32 md:w-32 overflow-hidden rounded-2xl border-2 border-primary/70 bg-secondary/60 shadow-[0_0_25px_hsl(var(--primary)/0.5)]">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-12 w-12 text-primary/70" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <h2 className="truncate font-display text-lg md:text-xl font-bold text-foreground">
              {toTitleCase(user.name || 'Não informado')}
            </h2>
            <div className="space-y-1.5">
              <ProfileRow icon={<Calendar className="h-4 w-4" />} label="Idade" value={plan?.age ? `${plan.age} anos` : 'Não informado'} />
              <ProfileRow icon={<Ruler className="h-4 w-4" />} label="Altura" value={plan?.height ? `${(plan.height / 100).toFixed(2).replace('.', ',')} m` : 'Não informado'} />
              <ProfileRow icon={<Weight className="h-4 w-4" />} label="Peso" value={plan?.weight ? `${plan.weight} kg` : 'Não informado'} />
            </div>
          </div>
        </motion.div>


        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <Button
            onClick={() => setOpen(true)}
            variant="outline"
            className="h-14 w-full rounded-2xl border-primary/60 bg-transparent font-display uppercase tracking-[0.2em] text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="mr-2 h-5 w-5" />
            {plan ? 'Editar Plano de Treino' : 'Novo Plano de Treino'}
          </Button>
        </motion.div>

        {/* Plano Atual */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-border/40 bg-card/40 p-4 md:p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-sm uppercase tracking-[0.25em] text-primary">
                Plano Atual
              </h2>
              {plan && plan.days.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.days.length} dia{plan.days.length === 1 ? '' : 's'}/semana
                </p>
              )}
            </div>
            {plan && plan.days.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                aria-label="Excluir plano"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-primary/80 transition hover:bg-primary/10 hover:text-primary"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {!plan || plan.days.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-background/30 py-12 px-6 text-center">
              <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
                Nenhum plano ativo
              </p>
              <p className="mt-2 max-w-xs text-xs md:text-sm text-muted-foreground/80">
                Crie seu primeiro plano de treino para começar sua jornada de evolução.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedDays.map((d, i) => (
                <motion.button
                  key={d}
                  type="button"
                  onClick={() => navigate(`/training/${d}`)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-card to-secondary/30 p-4 text-left transition-all hover:border-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)]',
                  )}
                >
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-accent shadow-[0_0_10px_hsl(var(--primary)/0.6)]" />
                  <div className="flex items-center gap-3 pl-2 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Dumbbell className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-base font-semibold text-foreground">
                        {DAY_LABELS[d]}
                      </div>
                      <div className="truncate text-[12px] text-primary/80">
                        {musclesForDay(d)}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </motion.button>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano de treino</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir seu plano atual? Todas as informações da tela de Treino serão resetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <TrainingPlanDialog open={open} onOpenChange={setOpen} initial={plan} onSave={handleSave} />
    </MainLayout>
  );
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-1.5 last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-display text-sm font-semibold text-primary">{value}</span>
    </div>
  );
}
