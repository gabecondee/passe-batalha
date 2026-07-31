import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { AttributeType } from '@/types/game';
import { cn } from '@/lib/utils';

interface AddSkillDialogProps {
  attribute: AttributeType;
  onAddSkill: (skill: {
    name: string;
    description: string;
    icon: string;
    attribute: AttributeType;
  }) => void;
}

const attributeLabels: Record<AttributeType, string> = {
  physical: 'Físico',
  mental: 'Mental',
  spiritual: 'Espiritual',
  professional: 'Profissional',
  financial: 'Financeiro',
};

const suggestedIcons = ['⚔️', '🥋', '🏃', '🎯', '📖', '💡', '🎨', '🎵', '🧘', '💻', '📊', '🌟', '🔥', '💎', '🏆', '🎮'];

export function AddSkillDialog({ attribute, onAddSkill }: AddSkillDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('⚔️');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddSkill({
      name: name.trim(),
      description: description.trim() || `Habilidade de ${attributeLabels[attribute]}`,
      icon,
      attribute,
    });

    setName('');
    setDescription('');
    setIcon('⚔️');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center gap-1.5 shrink-0 w-14">
          <button className="w-12 h-12 rounded-xl border-2 border-dashed border-border/40 bg-muted/10 flex items-center justify-center hover:border-primary/40 hover:bg-muted/30 transition-all">
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-[10px] text-muted-foreground text-center leading-tight">
            Adicionar
          </span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Nova Habilidade</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({attributeLabels[attribute]})
            </span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill-name">Nome da Habilidade</Label>
            <Input
              id="skill-name"
              placeholder="Ex: Taekwondo, Leitura Dinâmica..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-description">Descrição (opcional)</Label>
            <Textarea
              id="skill-description"
              placeholder="Descreva o que essa habilidade representa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {suggestedIcons.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    "w-10 h-10 rounded-lg border text-xl flex items-center justify-center transition-all",
                    icon === emoji
                      ? "border-primary bg-primary/20 scale-110"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
