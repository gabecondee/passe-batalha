import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MUSCLES, MuscleId } from '@/lib/workoutStorage';
import { MuscleIcon } from './MuscleIcon';
import { cn } from '@/lib/utils';

interface MuscleSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: MuscleId[];
  onSave: (ids: MuscleId[]) => void;
}

export function MuscleSelectorDialog({
  open,
  onOpenChange,
  selected,
  onSave,
}: MuscleSelectorDialogProps) {
  const [local, setLocal] = useState<MuscleId[]>(selected);

  useEffect(() => {
    if (open) setLocal(selected);
  }, [open, selected]);

  const toggle = (id: MuscleId) => {
    setLocal((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-background/85 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:border-x sm:border-border/10 z-50 flex flex-col',
            'bg-gradient-to-b from-background via-background to-[hsl(220_30%_3%)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 pt-6">
            <DialogPrimitive.Title className="font-display text-xl font-semibold tracking-wide text-foreground">
              Editar músculo trabalhado
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-32 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MUSCLES.map((m) => {
                const active = local.includes(m.id);
                return (
                  <motion.button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'relative flex aspect-[4/5] flex-col items-center justify-between overflow-hidden rounded-3xl border bg-[hsl(220_30%_6%)] p-2 text-left transition-all duration-200',
                      active
                        ? 'border-[hsl(140_90%_55%/0.7)] shadow-[0_0_22px_hsl(140_90%_55%/0.35)]'
                        : 'border-border/20 hover:border-border/50',
                    )}
                    aria-pressed={active}
                    aria-label={m.name}
                  >
                    {/* Checkbox top-left */}
                    <div
                      className={cn(
                        'absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all',
                        active
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-muted-foreground/40 bg-transparent',
                      )}
                    >
                      {active && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </motion.span>
                      )}
                    </div>

                    {/* Illustration */}
                    <div className="flex flex-1 items-center justify-center pt-4">
                      <div className="h-full w-full">
                        <MuscleIcon id={m.id} active={active} />
                      </div>
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        'w-full pb-2 text-center text-sm font-medium transition-colors',
                        active ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {m.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Footer save button */}
          <div className="absolute inset-x-0 bottom-0 z-10 border-t border-border/40 bg-background/95 px-4 pb-6 pt-4 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{local.length} selecionado{local.length === 1 ? '' : 's'}</span>
              {local.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLocal([])}
                  className="text-muted-foreground/80 transition hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>
            <Button
              onClick={() => {
                onSave(local);
                onOpenChange(false);
              }}
              className="h-12 w-full rounded-full bg-gradient-to-r from-primary to-accent font-display uppercase tracking-widest text-primary-foreground shadow-[0_0_25px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_35px_hsl(var(--primary)/0.7)]"
            >
              Salvar
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
