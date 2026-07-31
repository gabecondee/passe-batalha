import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (name: string, time: string) => void;
  initialName?: string;
  initialTime?: string;
}

const suggestions = ['Café da manhã', 'Almoço', 'Jantar', 'Pré-treino', 'Pós-treino', 'Lanche'];

export function MealDialog({ open, onOpenChange, onSave, initialName, initialTime }: Props) {
  const [name, setName] = useState(initialName ?? '');
  const [time, setTime] = useState(initialTime ?? '08:00');

  useEffect(() => {
    if (open) {
      setName(initialName ?? '');
      setTime(initialTime ?? '08:00');
    }
  }, [open, initialName, initialTime]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, time);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-primary/30 bg-background/85 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg uppercase tracking-widest text-gradient-cyan">
            <UtensilsCrossed className="h-5 w-5" />
            {initialName ? 'Editar Refeição' : 'Nova Refeição'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome da refeição</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Café da manhã"
              className="rounded-xl border-border/60 bg-card/60"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className="rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Horário</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-xl border-border/60 bg-card/60"
            />
          </div>
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              onClick={submit}
              disabled={!name.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-5 font-display text-sm uppercase tracking-widest text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
            >
              {initialName ? 'Salvar' : 'Criar refeição'}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
