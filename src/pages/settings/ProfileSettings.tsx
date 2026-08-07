import { useEffect, useMemo, useRef, useState } from 'react';
import { User, Camera, Trash2, Save, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const CLASSES: { value: string; label: string }[] = [
  { value: 'warrior', label: 'Guerreiro' },
  { value: 'guardian', label: 'Guardião' },
  { value: 'rogue', label: 'Ladino' },
  { value: 'mage', label: 'Mago' },
  { value: 'monk', label: 'Monge' },
  { value: 'paladin', label: 'Paladino' },
];

export default function ProfileSettings() {
  const { user, updateAvatar, refreshProfile } = useGame();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState<string>('');
  const [klass, setKlass] = useState<string>('warrior');
  const [birthDate, setBirthDate] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar dados diretamente do Supabase ao montar a tela
  useEffect(() => {
    async function loadProfileFromDB() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('name, class, birth_date, weight, height, gender')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profile) {
          if (profile.name) setName(profile.name);
          if (profile.class) setKlass(profile.class);
          if (profile.birth_date) setBirthDate(profile.birth_date.slice(0, 10));
          if (profile.weight !== null && profile.weight !== undefined) setWeight(String(profile.weight));
          if (profile.height !== null && profile.height !== undefined) setHeight(String(profile.height));
          if (profile.gender) setGender(profile.gender);
        }
      } catch (err) {
        console.error('Erro ao carregar perfil do banco:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfileFromDB();
  }, []);

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

  const save = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      toast.error('Usuário não autenticado.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim() || null,
          class: klass || null,
          birth_date: birthDate.trim() ? birthDate : null,
          weight: weight.trim() ? parseFloat(weight) : null,
          height: height.trim() ? parseFloat(height) : null,
          gender: gender || null,
        })
        .eq('id', authUser.id);

      if (error) {
        console.error('Erro ao salvar perfil no Supabase:', error);
        toast.error('Erro ao salvar no banco de dados: ' + error.message);
        setSaving(false);
        return;
      }

      if (name.trim()) localStorage.setItem('user_name', name.trim());
      if (klass) localStorage.setItem('user_class', klass);

      await refreshProfile();
      toast.success('Perfil salvo!');
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro ao conectar ao banco de dados.');
    } finally {
      setSaving(false);
    }
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

        {/* Fields card */}
        <div className="fantasy-card p-5 md:p-6 space-y-4">
          {loading ? (
            <div className="py-8 flex justify-center items-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" /> Carregando perfil do banco...
            </div>
          ) : (
            <>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-display">Classe</label>
                  <Select value={klass} onValueChange={setKlass}>
                    <SelectTrigger className="w-full h-10 bg-background/50 border-border text-sm font-medium">
                      <SelectValue placeholder="Selecione sua classe" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-card border-border/80">
                      {CLASSES.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="cursor-pointer">
                          <span className="font-semibold">{c.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-display">Sexo</label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="w-full h-10 bg-background/50 border-border text-sm font-medium">
                      <SelectValue placeholder="Selecione o sexo" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-card border-border/80">
                      <SelectItem value="male" className="cursor-pointer font-semibold">Masculino</SelectItem>
                      <SelectItem value="female" className="cursor-pointer font-semibold">Feminino</SelectItem>
                      <SelectItem value="other" className="cursor-pointer font-semibold">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/40">
                {/* Data de nascimento com Popover + Calendar em Português */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-display block">Data de Nascimento</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal border-border bg-background/50 hover:bg-muted/50 text-sm px-3",
                          !birthDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
                        {formattedBirthDate || <span className="text-muted-foreground">dd/mm/aaaa</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                      <Calendar
                        mode="single"
                        selected={birthDate ? parseISO(birthDate) : undefined}
                        onSelect={(d) => d && setBirthDate(format(d, 'yyyy-MM-dd'))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-display block">Peso (kg)</label>
                  <div className="flex items-center rounded-lg border border-border bg-background/50 overflow-hidden h-10">
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseFloat(weight) || 0;
                        setWeight(Math.max(0, parseFloat((current - 0.5).toFixed(1))).toString());
                      }}
                      className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-r border-border/40 shrink-0 font-bold text-base"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="Ex: 75.5"
                      className="w-full h-full bg-transparent px-2 text-center text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseFloat(weight) || 0;
                        setWeight(parseFloat((current + 0.5).toFixed(1)).toString());
                      }}
                      className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-l border-border/40 shrink-0 font-bold text-base"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-display block">Altura (cm)</label>
                  <div className="flex items-center rounded-lg border border-border bg-background/50 overflow-hidden h-10">
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(height) || 0;
                        setHeight(Math.max(0, current - 1).toString());
                      }}
                      className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-r border-border/40 shrink-0 font-bold text-base"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="1"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="Ex: 175"
                      className="w-full h-full bg-transparent px-2 text-center text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(height) || 0;
                        setHeight((current + 1).toString());
                      }}
                      className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-l border-border/40 shrink-0 font-bold text-base"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={save}
                disabled={saving || !name.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary/90 hover:bg-primary text-primary-foreground font-display tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Salvar Alterações
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
