import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, Monitor, LogOut, Trash2, AlertTriangle, Download } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function dumpLocalStorage() {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) out[k] = localStorage.getItem(k) || '';
  }
  return out;
}

export default function AccountSettings() {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [deleteInput, setDeleteInput] = useState('');

  const exportData = () => {
    const data = dumpLocalStorage();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passe-batalha-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Dados exportados com sucesso!');
  };

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    toast.success('Sessão encerrada');
    navigate('/', { replace: true });
  };

  const deleteAccount = async () => {
    if (deleteInput !== 'excluir-conta') return;
    try { 
      const { error } = await supabase.rpc('delete_user_account');
      
      if (error) {
        console.error("Erro ao excluir conta:", error);
        toast.error("Não foi possível excluir a conta. " + error.message);
        return; // Pare a execução aqui!
      }

      await supabase.auth.signOut(); 
    } catch (e: any) {
      console.error("Erro de rede/execução ao excluir conta:", e);
      toast.error("Erro inesperado ao excluir conta.");
      return;
    }
    
    localStorage.clear();
    toast.success('Conta excluída. Sentiremos sua falta, guerreiro.');
    navigate('/', { replace: true });
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl mx-auto pb-8">
        <SettingsHeader icon={DoorOpen} title="Conta" backTo="/settings" />

        <div className="fantasy-card p-5">
          <h3 className="font-display uppercase tracking-wider text-sm text-primary flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4" /> Sessões ativas
          </h3>
          <div className="flex items-center justify-between border border-border/60 rounded-lg p-3">
            <div>
              <p className="text-sm font-display">Este dispositivo</p>
              <p className="text-xs text-muted-foreground">{navigator.userAgent.slice(0, 60)}…</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 font-display uppercase">Ativa</span>
          </div>
        </div>

        <button onClick={exportData} className="fantasy-card w-full p-4 flex items-center gap-4 hover:shadow-[0_0_15px_hsl(var(--primary)/0.25)] transition-shadow">
          <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-display uppercase tracking-wider text-sm">Exportar dados</p>
            <p className="text-xs text-muted-foreground">Baixe todos os seus dados em formato JSON</p>
          </div>
        </button>

        <button onClick={signOut} className="fantasy-card w-full p-4 flex items-center gap-4 hover:shadow-[0_0_15px_hsl(var(--primary)/0.25)] transition-shadow">
          <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-display uppercase tracking-wider text-sm">Sair da conta</p>
            <p className="text-xs text-muted-foreground">Encerra sua sessão neste dispositivo</p>
          </div>
        </button>

        <button onClick={() => setStep(1)} className="fantasy-card w-full p-4 flex items-center gap-4 hover:shadow-[0_0_15px_hsl(var(--destructive)/0.35)] transition-shadow">
          <div className="w-11 h-11 rounded-lg bg-destructive/10 border border-destructive/50 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div className="text-left">
            <p className="font-display uppercase tracking-wider text-sm text-destructive">Excluir conta</p>
            <p className="text-xs text-muted-foreground">Remove permanentemente todos os seus dados</p>
          </div>
        </button>

        {step >= 1 && (
          <div className="fantasy-card p-5 border border-destructive/50 space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <p className="font-display text-sm">Essa ação é irreversível.</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Todos os dados locais, missões, XP, conquistas e configurações serão perdidos.
            </p>
            {step === 1 ? (
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 px-3 py-2 rounded-lg border border-destructive/60 text-destructive font-display text-xs tracking-wider">CONTINUAR</button>
                <button onClick={() => setStep(0)} className="flex-1 px-3 py-2 rounded-lg border border-border font-display text-xs tracking-wider">CANCELAR</button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-sm font-display text-destructive">Para continuar, digite <span className="font-bold">excluir-conta</span> abaixo:</p>
                <input 
                  type="text" 
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  className="w-full bg-background border border-destructive/50 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-destructive" 
                  placeholder="excluir-conta"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={deleteAccount} 
                    disabled={deleteInput !== 'excluir-conta'}
                    className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground font-display text-xs tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  >EXCLUIR DEFINITIVAMENTE</button>
                  <button onClick={() => { setStep(0); setDeleteInput(''); }} className="flex-1 px-3 py-2 rounded-lg border border-border font-display text-xs tracking-wider">CANCELAR</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
