import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha email e senha.');
      return;
    }
    const { error } = await authService.signUp({ email, password });
    if (error) {
      toast.error('Erro no cadastro: ' + error.message);
    } else {
      // Bypass temporário do Onboarding
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('user_name', 'Guerreiro Teste');
      localStorage.setItem('user_class', 'warrior');
      localStorage.setItem('initial_skills', JSON.stringify({
        physical: 50, mental: 50, spiritual: 50, professional: 50, financial: 50
      }));
      toast.success('Cadastro realizado com sucesso! Você foi logado.');
      window.location.href = '/';
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha email e senha.');
      return;
    }
    const { error } = await authService.signIn({ email, password });
    if (error) {
      toast.error('Erro no login: ' + error.message);
    } else {
      // Bypass temporário do Onboarding
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('user_name', 'Guerreiro Teste');
      localStorage.setItem('user_class', 'warrior');
      localStorage.setItem('initial_skills', JSON.stringify({
        physical: 50, mental: 50, professional: 50, financial: 50, spiritual: 50
      }));
      toast.success('Login bem-sucedido!');
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-8 text-amber-500">Teste de Autenticação</h1>
      
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="space-y-4 mb-8">
          <Input 
            type="email" 
            placeholder="E-mail" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-950 border-slate-700"
          />
          <Input 
            type="password" 
            placeholder="Senha" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-950 border-slate-700"
          />
        </div>

        <div className="flex gap-4">
          <Button 
            onClick={handleSignUp}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white"
          >
            Cadastrar
          </Button>
          <Button 
            onClick={handleSignIn}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
          >
            Entrar
          </Button>
        </div>
      </div>
    </div>
  );
}
