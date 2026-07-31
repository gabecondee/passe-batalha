import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { JOURNAL_CATEGORIES, JournalCategory, JournalEntry } from '@/hooks/useJournal';
import { cn } from '@/lib/utils';

interface JournalEntryDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: { title: string; category: JournalCategory; content: string; date: string }) => void;
  entry?: JournalEntry | null;
}

export function JournalEntryDialog({ open, onOpenChange, onSave, entry }: JournalEntryDialogProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<JournalCategory>('reflexao');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (open) {
      setTitle(entry?.title ?? '');
      setCategory(entry?.category ?? 'reflexao');
      setContent(entry?.content ?? '');
      setDate(entry?.date ?? format(new Date(), 'yyyy-MM-dd'));
    }
  }, [open, entry]);

  const handleSave = () => {
    if (!title.trim()) return toast.error('Dê um título ao registro.');
    if (!content.trim()) return toast.error('Escreva algum conteúdo.');
    onSave({ title: title.trim(), category, content, date });
    onOpenChange(false);
    toast.success(entry ? '📖 Registro atualizado!' : '📖 Novo registro salvo!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg border-primary/30 bg-card max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wider text-primary">
            {entry ? 'Editar registro' : 'Novo registro'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="j-title">Título</Label>
            <Input
              id="j-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hoje consegui manter meu foco"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="j-category">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as JournalCategory)}>
              <SelectTrigger
                id="j-category"
                className="w-full rounded-xl border-border/60 bg-background/60 text-foreground focus:ring-primary/40"
              >
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent className="border-border/60 bg-card">
                {Object.values(JOURNAL_CATEGORIES).map((c) => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    className={cn(
                      'cursor-pointer focus:bg-primary/10 focus:text-foreground',
                      category === c.id && `${c.text}`,
                    )}
                  >
                    <span className="mr-2">{c.icon}</span>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="j-content">Texto</Label>
            <Textarea
              id="j-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={9}
              placeholder="Escreva livremente sobre seu dia, aprendizados ou reflexões..."
              className="resize-y leading-relaxed"
            />
            <p className="text-right text-xs text-muted-foreground">
              {content.trim() ? content.trim().split(/\s+/).length : 0} palavras
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="j-date">Data</Label>
            <Input id="j-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 rounded-full bg-gradient-to-r from-primary to-accent font-display uppercase tracking-wider"
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
