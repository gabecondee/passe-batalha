import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Sparkles, UserCheck, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';

export type WeekDayKey = 'D' | 'S1' | 'T' | 'Q1' | 'Q2' | 'S2' | 'S3';

export interface TrainingPlan {
  age: number;
  height: number;
  weight: number;
  days: WeekDayKey[];
  time?: string;
}

interface TrainingPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: TrainingPlan | null;
  onSave: (plan: TrainingPlan) => void;
}

const WEEK_DAYS: { key: WeekDayKey; label: string; full: string }[] = [
  { key: 'D', label: 'D', full: 'Domingo' },
  { key: 'S1', label: 'S', full: 'Segunda' },
  { key: 'T', label: 'T', full: 'Terça' },
  { key: 'Q1', label: 'Q', full: 'Quarta' },
  { key: 'Q2', label: 'Q', full: 'Quinta' },
  { key: 'S2', label: 'S', full: 'Sexta' },
  { key: 'S3', label: 'S', full: 'Sábado' },
];

function calculateAgeFromBirthDate(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const cleanDate = birthDateStr.slice(0, 10);
  const today = new Date();
  const birth = new Date(cleanDate + 'T00:00:00');
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

function NumberStepper({ label, value, min, max, step = 1, unit, onChange }: NumberStepperProps) {
  const inc = () => onChange(Math.min(max, parseFloat((value + step).toFixed(1))));
  const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(1))));

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-secondary/40 p-3 backdrop-blur-sm">
      <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={dec}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] active:scale-95 shrink-0"
          aria-label={`Diminuir ${label}`}
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
          {unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={inc}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] active:scale-95 shrink-0"
          aria-label={`Aumentar ${label}`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TrainingPlanDialog({ open, onOpenChange, initial, onSave }: TrainingPlanDialogProps) {
  const { user, refreshProfile } = useGame();

  const profileAge = useMemo(() => calculateAgeFromBirthDate(user.birthDate), [user.birthDate]);
  const hasFullBio = Boolean(profileAge !== null && user.weight && user.height);

  const [birthDate, setBirthDate] = useState<string>(user.birthDate || '');
  const [age, setAge] = useState<number>(profileAge ?? initial?.age ?? 25);
  const [height, setHeight] = useState<number>(user.height ?? initial?.height ?? 175);
  const [weight, setWeight] = useState<number>(user.weight ?? initial?.weight ?? 70);
  const [days, setDays] = useState<WeekDayKey[]>([]);
  const [time, setTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const computedAge = calculateAgeFromBirthDate(user.birthDate) ?? profileAge ?? initial?.age ?? 25;
      setAge(computedAge);
      setHeight(user.height ?? initial?.height ?? 175);
      setWeight(user.weight ?? initial?.weight ?? 70);
      setBirthDate(user.birthDate || '');
      setDays(initial?.days ?? []);
      setTime(initial?.time ?? '18:00');
    }
  }, [open, initial, user.birthDate, user.height, user.weight, profileAge]);

  // If birthDate changes, update age
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

  const toggleDay = (k: WeekDayKey) => {
    setDays((prev) => (prev.includes(k) ? prev.filter((d) => d !== k) : [...prev, k]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Obter o ID real do usuário autenticado no Supabase
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const targetUserId = authUser?.id || user?.id;

      if (targetUserId) {
        const updates: Record<string, any> = {};
        if (!user.weight && weight) updates.weight = weight;
        if (!user.height && height) updates.height = height;
        if (!user.birthDate && birthDate) updates.birth_date = birthDate;

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase.from('profiles').update(updates).eq('id', targetUserId);
          if (error) {
            console.error("Erro ao atualizar profiles no TrainingPlanDialog:", error);
          } else {
            await refreshProfile();
          }
        }
      }

      onSave({ age, height, weight, days, time });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border-primary/30 bg-card/90 backdrop-blur-xl">
        {/* glow background */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg uppercase tracking-widest">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-gradient-cyan">Configurar Treino</span>
          </DialogTitle>
        </DialogHeader>

        {(!user.birthDate || !user.height || !user.weight) && (
          <div className="space-y-3">
            {/* Nascimento Picker se faltar no perfil */}
            {!user.birthDate && profileAge === null && (
              <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-secondary/40 p-3 backdrop-blur-sm">
                <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Nascimento
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-9 justify-start text-left font-normal border-border bg-background/60 text-xs px-3 min-w-[140px]",
                        !birthDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />
                      {formattedBirthDate || <span className="text-muted-foreground">dd/mm/aaaa</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="end">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown-buttons"
                      fromYear={1920}
                      toYear={new Date().getFullYear()}
                      selected={birthDate ? parseISO(birthDate) : undefined}
                      onSelect={(d) => d && setBirthDate(format(d, 'yyyy-MM-dd'))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Altura Stepper se faltar no perfil */}
            {!user.height && (
              <NumberStepper label="Altura" value={height} min={120} max={230} onChange={setHeight} unit="cm" />
            )}

            {/* Peso Stepper se faltar no perfil */}
            {!user.weight && (
              <NumberStepper label="Peso" value={weight} min={30} max={200} onChange={setWeight} unit="kg" />
            )}
          </div>
        )}

        <div className="mt-2 space-y-3">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Quais dias da semana irá treinar?
          </p>
          <div className="flex justify-between gap-1.5">
            {WEEK_DAYS.map((d) => {
              const active = days.includes(d.key);
              return (
                <motion.button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-bold uppercase transition-all',
                    active
                      ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.7)]'
                      : 'bg-secondary/60 text-muted-foreground hover:bg-secondary',
                  )}
                  aria-label={d.full}
                  aria-pressed={active}
                >
                  {d.label}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/40 bg-secondary/40 p-3 backdrop-blur-sm">
            <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Horário
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 font-display text-base tabular-nums text-gradient-cyan outline-none focus:border-primary/60 focus:shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
              aria-label="Horário do treino"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || days.length === 0}
          className="mt-4 h-12 w-full bg-gradient-to-r from-primary to-accent font-display uppercase tracking-widest text-primary-foreground shadow-[0_0_25px_hsl(var(--primary)/0.4)] transition-all hover:shadow-[0_0_35px_hsl(var(--primary)/0.7)] disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Plano'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
