import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Sparkles, CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface DietPlan {
  gender: 'homem' | 'mulher';
  age: number;
  height: number;
  weight: number;
  activity: 'sedentario' | 'leve' | 'moderado' | 'intenso';
  goal: 'perder' | 'ganhar' | 'manutencao';
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGenerate: (plan: DietPlan) => void;
  initial?: Partial<DietPlan>;
}

function calculateAgeFromBirthDate(birthDateString?: string | null): number | null {
  if (!birthDateString) return null;
  const cleanDate = birthDateString.slice(0, 10);
  const today = new Date();
  const birth = new Date(cleanDate + 'T00:00:00');
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

const activities = [
  { id: 'sedentario', label: 'Sedentário' },
  { id: 'leve', label: 'Leve' },
  { id: 'moderado', label: 'Moderado' },
  { id: 'intenso', label: 'Intenso' },
] as const;

const goals = [
  { id: 'perder', label: 'Perder peso' },
  { id: 'ganhar', label: 'Ganhar massa' },
  { id: 'manutencao', label: 'Manutenção' },
] as const;

function NumberStepper({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-secondary/40 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 sm:gap-3 w-full justify-between">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] active:scale-95 shrink-0"
          aria-label="Diminuir"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <div className="flex items-center justify-center">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
            }}
            className="w-14 bg-transparent text-center font-display text-lg font-semibold tabular-nums text-gradient-cyan outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {suffix && <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] active:scale-95 shrink-0"
          aria-label="Aumentar"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function DietPlanDialog({ open, onOpenChange, onGenerate, initial }: Props) {
  const { user, refreshProfile } = useGame();

  const profileAge = useMemo(() => calculateAgeFromBirthDate(user.birthDate), [user.birthDate]);

  const profileGender: 'homem' | 'mulher' | null = useMemo(() => {
    if (user.gender === 'male' || user.gender === 'homem') return 'homem';
    if (user.gender === 'female' || user.gender === 'mulher') return 'mulher';
    return null;
  }, [user.gender]);

  const [birthDate, setBirthDate] = useState<string>(user.birthDate || '');
  const [gender, setGender] = useState<'homem' | 'mulher'>(profileGender ?? (initial?.gender === 'mulher' ? 'mulher' : 'homem'));
  const [age, setAge] = useState<number>(profileAge ?? initial?.age ?? 25);
  const [height, setHeight] = useState<number>(user.height ?? initial?.height ?? 175);
  const [weight, setWeight] = useState<number>(user.weight ?? initial?.weight ?? 72);
  const [activity, setActivity] = useState<DietPlan['activity']>(initial?.activity ?? 'moderado');
  const [goal, setGoal] = useState<DietPlan['goal']>(initial?.goal ?? 'ganhar');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const computedAge = calculateAgeFromBirthDate(user.birthDate) ?? profileAge ?? initial?.age ?? 25;
      setAge(computedAge);
      setHeight(user.height ?? initial?.height ?? 175);
      setWeight(user.weight ?? initial?.weight ?? 72);
      setBirthDate(user.birthDate || '');
      if (profileGender) setGender(profileGender);
      setActivity(initial?.activity ?? 'moderado');
      setGoal(initial?.goal ?? 'ganhar');
    }
  }, [open, initial, user.birthDate, user.height, user.weight, profileAge, profileGender]);

  useEffect(() => {
    if (birthDate) {
      const calculated = calculateAgeFromBirthDate(birthDate);
      if (calculated !== null) setAge(calculated);
    }
  }, [birthDate]);

  const formattedBirthDate = useMemo(() => {
    if (!birthDate) return null;
    try {
      const d = parseISO(birthDate);
      if (isNaN(d.getTime())) return null;
      return format(d, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return null;
    }
  }, [birthDate]);

  const submit = async () => {
    setSaving(true);
    try {
      // Obter o ID do usuário real no Supabase
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const targetUserId = authUser?.id || user?.id;

      if (targetUserId) {
        const updates: Record<string, any> = {};
        if (!user.gender && gender) updates.gender = gender === 'homem' ? 'male' : 'female';
        if (!user.birthDate && birthDate) updates.birth_date = birthDate;
        if (!user.height && height) updates.height = height;
        if (!user.weight && weight) updates.weight = weight;

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase.from('profiles').update(updates).eq('id', targetUserId);
          if (!error) {
            await refreshProfile();
          }
        }
      }

      const finalAge = profileAge ?? calculateAgeFromBirthDate(birthDate) ?? age;
      onGenerate({
        gender: profileGender ?? gender,
        age: finalAge,
        height: user.height ?? height,
        weight: user.weight ?? weight,
        activity,
        goal,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-primary/30 bg-background/80 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-widest text-gradient-cyan">
            Configurar Plano Alimentar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Missing Profile Fields Section */}
          {(!profileGender || !user.birthDate || !user.height || !user.weight) && (
            <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="font-display text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
                Preencha os dados ausentes do seu Perfil
              </p>

              {/* Sexo */}
              {!profileGender && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">SEXO</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['homem', 'mulher'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={cn(
                          'rounded-xl border-2 px-3 py-2.5 font-display text-sm uppercase tracking-wider transition',
                          gender === g
                            ? 'border-primary bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]'
                            : 'border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        {g === 'homem' ? 'Homem' : 'Mulher'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data de Nascimento */}
              {!user.birthDate && (
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Data de Nascimento</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'h-11 w-full justify-start text-left font-normal bg-secondary/40 border-border/40',
                          !birthDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {formattedBirthDate ? formattedBirthDate : <span>Selecione sua data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                      <Calendar
                        mode="single"
                        selected={birthDate ? parseISO(birthDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setBirthDate(`${year}-${month}-${day}`);
                          }
                        }}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Altura */}
              {!user.height && (
                <div>
                  <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Qual a sua altura?</p>
                  <NumberStepper value={height} onChange={setHeight} min={120} max={230} suffix="cm" />
                </div>
              )}

              {/* Peso */}
              {!user.weight && (
                <div>
                  <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Seu peso</p>
                  <NumberStepper value={weight} onChange={setWeight} min={30} max={250} suffix="kg" />
                </div>
              )}
            </div>
          )}

          {/* Activity */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Nível de atividade física</p>
            <div className="grid grid-cols-2 gap-2">
              {activities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActivity(a.id)}
                  className={cn(
                    'rounded-xl border-2 px-3 py-2.5 text-sm transition',
                    activity === a.id
                      ? 'border-primary bg-primary/15 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.3)]'
                      : 'border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Qual é o seu objetivo?</p>
            <div className="grid grid-cols-1 gap-2">
              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id)}
                  className={cn(
                    'rounded-xl border-2 px-3 py-2.5 text-sm transition',
                    goal === g.id
                      ? 'border-primary bg-primary/15 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.3)]'
                      : 'border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={submit}
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-6 font-display text-base uppercase tracking-widest text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.5)]"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {saving ? 'Gerando...' : 'Gerar Plano'}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
