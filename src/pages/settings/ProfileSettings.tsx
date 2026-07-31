import { useRef, useState } from 'react';
import { User, Camera, Trash2, Save } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { useGame } from '@/contexts/GameContext';
import { toast } from 'sonner';

const CLASSES: { value: string; label: string }[] = [
  { value: 'warrior', label: 'Guerreiro' },
  { value: 'guardian', label: 'Guardião' },
  { value: 'rogue', label: 'Ladino' },
  { value: 'mage', label: 'Mago' },
  { value: 'monk', label: 'Monge' },
  { value: 'paladin', label: 'Paladino' },
];

export default function ProfileSettings() {
  const { user, updateAvatar } = useGame();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState<string>(() => localStorage.getItem('user_name') || user.name || '');
  const [klass, setKlass] = useState<string>(() => localStorage.getItem('user_class') || 'warrior');

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Selecione uma imagem');
    updateAvatar(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    localStorage.removeItem('user_avatar');
    toast.success('Foto removida');
    window.location.reload();
  };

  const save = () => {
    if (name.trim()) localStorage.setItem('user_name', name.trim());
    else localStorage.removeItem('user_name');
    localStorage.setItem('user_class', klass);
    toast.success('Perfil salvo!');
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl mx-auto pb-8">
        <SettingsHeader icon={User} title="Editar Perfil" backTo="/settings" />

        {/* Photo card */}
        <div className="fantasy-card p-6 flex flex-col items-center gap-4">
          <div className="relative">
            <img src={user.avatar} alt={user.name} className="w-28 h-28 rounded-full object-cover border-2 border-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.5)]" />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/50 text-primary text-xs font-display hover:bg-primary/10">
              <Camera className="w-4 h-4" /> Alterar Foto
            </button>
            <button onClick={removePhoto} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-destructive/50 text-destructive text-xs font-display hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" /> Remover
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={onFile} className="hidden" />
        </div>

        {/* Fields card — only Name + Class */}
        <div className="fantasy-card p-5 md:p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-display">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome de guerreiro"
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-display">Classe</label>
            <select
              value={klass}
              onChange={(e) => setKlass(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            >
              {CLASSES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <button onClick={save} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary/90 hover:bg-primary text-primary-foreground font-display tracking-wider transition-colors">
            <Save className="w-4 h-4" /> SALVAR ALTERAÇÕES
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
