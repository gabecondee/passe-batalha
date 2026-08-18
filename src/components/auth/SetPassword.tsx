import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SetPasswordProps {
  onComplete: () => void;
}

export const SetPassword = ({ onComplete }: SetPasswordProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      // 1. Atualizar a senha no Auth
      const { error: authError } = await supabase.auth.updateUser({ password });
      
      if (authError) throw authError;

      // 2. Obter o usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não encontrado');

      // 3. Atualizar a flag password_set no profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_set: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Senha definida com sucesso!');
      onComplete();

    } catch (err: any) {
      console.error('Erro ao definir senha:', err);
      toast.error(err.message || 'Ocorreu um erro ao definir sua senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c1830] p-4">
      <div className="w-full max-w-md bg-[#05080f]/90 p-8 rounded-3xl border border-amber-500/20 shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-6 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <Lock className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-amber-400 mb-2 tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          BEM-VINDO
        </h1>
        
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Defina uma senha segura para acessar sua conta futuramente.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="relative w-full">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
              <Lock className="w-5 h-5" />
            </span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova senha (min. 6 caracteres)"
              required
              className="pl-12 h-14 rounded-xl bg-transparent border border-amber-500/50 focus-visible:border-amber-400 focus-visible:ring-0 text-white placeholder:text-slate-400/70"
            />
          </div>

          <div className="relative w-full">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
              <Lock className="w-5 h-5" />
            </span>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme a nova senha"
              required
              className="pl-12 h-14 rounded-xl bg-transparent border border-amber-500/50 focus-visible:border-amber-400 focus-visible:ring-0 text-white placeholder:text-slate-400/70"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-[#05080f] font-bold h-14 rounded-xl text-base tracking-widest transition-all mt-4"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'SALVAR E CONTINUAR'}
          </Button>
        </form>
      </div>
    </div>
  );
};
