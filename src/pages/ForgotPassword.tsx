import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        toast.error('Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.');
      } else {
        toast.error('Não foi possível enviar o e-mail: ' + error.message);
      }
      return;
    }

    setSent(true);
    toast.success('Se esse e-mail estiver cadastrado, você vai receber um link de recuperação.');
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="text-xl font-bold">Verifique seu e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de recuperação para <strong>{email}</strong>, caso ele esteja
            cadastrado. O link expira em algumas horas.
          </p>
          <Link to="/" className="text-sm underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">
        <h1 className="text-xl font-bold">Esqueci minha senha</h1>
        <p className="text-sm text-muted-foreground">
          Digite o e-mail da sua conta. Vamos te enviar um link para redefinir a senha.
        </p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full px-3 py-2 rounded-lg border bg-background"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-lg font-semibold bg-primary text-primary-foreground disabled:opacity-50"
        >
          {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>
        <Link to="/" className="block text-center text-sm underline">
          Voltar para o login
        </Link>
      </form>
    </div>
  );
}
