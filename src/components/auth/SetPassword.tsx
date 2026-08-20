import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import logoSrc from '@/assets/logo.png';
import { motion } from 'framer-motion';

interface SetPasswordProps {
  onComplete: () => void;
}

export const SetPassword = ({ onComplete }: SetPasswordProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-[#0c1830] p-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-xs flex flex-col items-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="mb-6"
        >
          <img
            src={logoSrc}
            alt="Passe de Batalha"
            className="w-[90px] h-[90px] object-contain drop-shadow-[0_0_25px_rgba(245,158,11,0.7)] rounded-full"
          />
        </motion.div>
        
        <h1 
          className="text-white text-4xl font-bold mb-3 uppercase" 
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          CRIAR SENHA
        </h1>
        
        <p className="text-slate-400 text-sm mb-10 max-w-xs leading-relaxed">
          Bem-vindo(a)! Por segurança, defina agora uma senha só sua para continuar acessando o Passe de Batalha.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 items-center">
          <div className="relative w-full">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
              <Lock className="w-5 h-5" />
            </span>
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova senha (min. 6 caract.)"
              required
              className="pl-12 pr-12 h-14 rounded-xl bg-transparent border border-amber-500/50 focus-visible:border-amber-400 focus-visible:ring-0 text-white placeholder:text-slate-400/70 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative w-full">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
              <Lock className="w-5 h-5" />
            </span>
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme a nova senha"
              required
              className="pl-12 pr-12 h-14 rounded-xl bg-transparent border border-amber-500/50 focus-visible:border-amber-400 focus-visible:ring-0 text-white placeholder:text-slate-400/70 text-base"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 mt-4 rounded-xl text-base tracking-[0.18em] font-bold text-[#1a1208] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)] border border-amber-300/60 justify-center items-center gap-2"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'SALVAR E ENTRAR'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
