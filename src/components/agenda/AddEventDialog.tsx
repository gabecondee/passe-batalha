import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AGENDA_CATEGORIES, AgendaCategory, AgendaEvent, AgendaRecurrence } from '@/types/agenda';

export interface AgendaEventInput {
  name: string;
  category: AgendaCategory;
  date: string;
  time?: string;
  description?: string;
  recurrence: AgendaRecurrence;
  syncWithGoogle?: boolean;
}

interface AddEventDialogProps {
  onCreate: (data: AgendaEventInput) => void | Promise<void>;
  onUpdate?: (id: string, data: AgendaEventInput) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  editing?: AgendaEvent | null;
  trigger?: React.ReactNode;
  defaultDate?: Date;
  googleConnected?: boolean;
  /** Controlled open state (optional). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddEventDialog({
  onCreate,
  onUpdate,
  onDelete,
  editing,
  trigger,
  defaultDate,
  googleConnected = false,
  open: controlledOpen,
  onOpenChange,
}: AddEventDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  const isEditing = Boolean(editing);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<AgendaCategory>('personal');
  const [date, setDate] = useState(format(defaultDate ?? new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<AgendaRecurrence>('none');
  const [syncWithGoogle, setSyncWithGoogle] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate fields when opening for edit, or reset defaults when creating.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setCategory(editing.category);
      setDate(editing.date);
      setTime(editing.time ?? '');
      setDescription(editing.description ?? '');
      setRecurrence(editing.recurrence);
      setSyncWithGoogle(Boolean(editing.googleCalendarId));
    } else if (defaultDate) {
      setDate(format(defaultDate, 'yyyy-MM-dd'));
    }
  }, [open, editing, defaultDate]);

  const reset = () => {
    setName('');
    setCategory('personal');
    setDate(format(defaultDate ?? new Date(), 'yyyy-MM-dd'));
    setTime('');
    setDescription('');
    setRecurrence('none');
    setSyncWithGoogle(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Dê um nome ao evento.');
      return;
    }
    if (!date) {
      toast.error('Selecione uma data.');
      return;
    }
    setSaving(true);
    try {
      const payload: AgendaEventInput = {
        name: name.trim(),
        category,
        date,
        time: time || undefined,
        description: description.trim() || undefined,
        recurrence,
        syncWithGoogle: googleConnected && syncWithGoogle,
      };
      if (isEditing && editing && onUpdate) {
        await onUpdate(editing.id, payload);
        toast.success('✅ Evento atualizado!');
      } else {
        await onCreate(payload);
        toast.success('📅 Evento adicionado à sua agenda!');
      }
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar evento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !onDelete) return;
    try {
      await onDelete(editing.id);
      toast.success('Evento excluído com sucesso');
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      {trigger !== undefined || !isControlled ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="rounded-full bg-gradient-to-r from-primary to-accent font-display uppercase tracking-wider">
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent className="!flex !flex-col w-[calc(100vw-1rem)] max-w-md overflow-x-hidden border-primary/30 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wider text-gradient-cyan">
            {isEditing ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="evt-name">Nome do evento</Label>
            <Input id="evt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Treino de peito" />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as AgendaCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(AGENDA_CATEGORIES).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="mr-2">{c.icon}</span>{c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="evt-date">Data</Label>
              <Input id="evt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evt-time">Horário</Label>
              <Input id="evt-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Recorrência</Label>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as AgendaRecurrence)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não repetir</SelectItem>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evt-desc">Descrição (opcional)</Label>
            <Textarea id="evt-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-gradient-to-r from-primary to-accent font-display uppercase tracking-wider"
          >
            {saving ? 'Salvando...' : isEditing ? 'Salvar Evento' : 'Salvar Evento'}
          </Button>

          {isEditing && onDelete && (
            <Button
              onClick={handleDelete}
              variant="outline"
              className="w-full rounded-full border-red-500/60 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300 font-display uppercase tracking-wider"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir Evento
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
