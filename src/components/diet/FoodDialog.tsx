import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Apple, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FoodEntry {
  id: string;
  time: string;
  name: string;
  quantity: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (food: Omit<FoodEntry, 'id'>) => void;
  initial?: FoodEntry;
  onDelete?: () => void;
}

const empty = { time: '', name: '', quantity: '1', kcal: 0, carbs: 0, protein: 0, fat: 0 };

function CompactStepper({
  label,
  value,
  min = 0,
  max = 5000,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const inc = () => onChange(Math.min(max, parseFloat((value + step).toFixed(1))));
  const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(1))));

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
        {label}
      </label>
      <div className="flex items-center rounded-xl border border-border/60 bg-background/50 overflow-hidden h-10">
        <button
          type="button"
          onClick={dec}
          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-r border-border/40 shrink-0 font-bold text-base select-none"
        >
          -
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          className="w-full h-full bg-transparent px-1 text-center font-display text-sm font-semibold tabular-nums text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={inc}
          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-l border-border/40 shrink-0 font-bold text-base select-none"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function FoodDialog({ open, onOpenChange, onSave, initial, onDelete }: Props) {
  const [form, setForm] = useState<Omit<FoodEntry, 'id'>>(empty);
  const [quantityNum, setQuantityNum] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [aiQuantity, setAiQuantity] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        const { id, ...rest } = initial;
        setForm(rest);
        const parsed = Number(String(initial.quantity || '').replace(/[^0-9.]/g, ''));
        setQuantityNum(!isNaN(parsed) ? parsed : 1);
      } else {
        setForm(empty);
        setQuantityNum(1);
      }
      setDescription('');
      setAiQuantity('');
    }
  }, [open, initial]);

  const estimateWithAI = async () => {
    const q = description.trim();
    if (q.length < 2) {
      toast.error('Descreva o alimento primeiro');
      return;
    }
    setAiLoading(true);
    try {
      const fullDescription = aiQuantity.trim() ? `${q} - ${aiQuantity.trim()}` : q;
      const { data, error } = await supabase.functions.invoke('estimate-nutrition', {
        body: { description: fullDescription },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const rawQty = data.quantity || aiQuantity.trim() || '1';
      const parsedQty = Number(String(rawQty).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedQty)) {
        setQuantityNum(parsedQty);
      }

      setForm((f) => ({
        ...f,
        name: data.name || q,
        quantity: String(!isNaN(parsedQty) ? parsedQty : '1'),
        kcal: Math.max(0, Number(data.kcal) || 0),
        carbs: Math.max(0, Number(data.carbs) || 0),
        protein: Math.max(0, Number(data.protein) || 0),
        fat: Math.max(0, Number(data.fat) || 0),
      }));
      toast.success('Estimativa de IA aplicada');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao estimar com IA');
    } finally {
      setAiLoading(false);
    }
  };

  const update = <K extends keyof Omit<FoodEntry, 'id'>>(k: K, v: Omit<FoodEntry, 'id'>[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, name: form.name.trim(), quantity: String(quantityNum) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-primary/30 bg-background/85 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg uppercase tracking-widest text-gradient-cyan">
            <Apple className="h-5 w-5" />
            {initial ? 'Editar Alimento' : 'Registrar Alimento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Estimativa por IA */}
          <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary font-semibold">
              <Sparkles className="h-3 w-3" />
              Descreva o alimento
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Ex: "pão francês" ou "2 ovos cozidos"'
              className="rounded-xl border-border/60 bg-background/60"
            />
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Quantidade</Label>
            <Input
              value={aiQuantity}
              onChange={(e) => setAiQuantity(e.target.value)}
              placeholder="Ex: 1, 2, 150"
              className="rounded-xl border-border/60 bg-background/60"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={estimateWithAI}
              disabled={aiLoading || description.trim().length < 2}
              className="w-full rounded-xl border-accent/40 bg-accent/10 text-xs text-accent hover:bg-accent/20 font-display tracking-wider uppercase"
            >
              {aiLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              Estimar com IA
            </Button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Registrar Manualmente
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          {/* Nome do alimento */}
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Alimento</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Ex: Ovo"
              className="rounded-xl border-border/60 bg-card/60 h-10 font-medium"
            />
          </div>

          {/* Quantidade e Calorias lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <CompactStepper
              label="Quantidade"
              value={quantityNum}
              min={0}
              max={5000}
              step={1}
              onChange={(v) => {
                setQuantityNum(v);
                update('quantity', String(v));
              }}
            />
            <CompactStepper
              label="Calorias (kcal)"
              value={form.kcal}
              min={0}
              max={5000}
              step={10}
              onChange={(v) => update('kcal', v)}
            />
          </div>

          {/* Carbo, Proteína e Gordura lado a lado */}
          <div className="grid grid-cols-3 gap-2">
            <CompactStepper
              label="Carbo (g)"
              value={form.carbs}
              min={0}
              max={1000}
              step={1}
              onChange={(v) => update('carbs', v)}
            />
            <CompactStepper
              label="Proteína (g)"
              value={form.protein}
              min={0}
              max={1000}
              step={1}
              onChange={(v) => update('protein', v)}
            />
            <CompactStepper
              label="Gordura (g)"
              value={form.fat}
              min={0}
              max={1000}
              step={1}
              onChange={(v) => update('fat', v)}
            />
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              onClick={submit}
              disabled={!form.name.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-5 font-display text-sm uppercase tracking-widest text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] mt-2"
            >
              Salvar alimento
            </Button>
          </motion.div>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition hover:text-destructive pt-1"
            >
              <Trash2 className="h-3 w-3" />
              Excluir alimento
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
