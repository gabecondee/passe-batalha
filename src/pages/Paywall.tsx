import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function Paywall() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { return_url: window.location.origin }
      });
      
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao iniciar assinatura. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary shadow-[0_0_24px_hsl(var(--primary)/0.2)]">
            <Lock className="h-10 w-10 drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
          </div>
          
          <div className="space-y-2">
            <h1 className="font-display text-2xl md:text-3xl uppercase tracking-widest text-foreground">
              Acesso Bloqueado
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed px-4">
              Sua assinatura não está ativa. Para continuar sua jornada e ter acesso completo aos módulos do passe de batalha, inicie sua assinatura agora.
            </p>
          </div>

          <Button 
            onClick={handleCheckout} 
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-display tracking-widest uppercase h-14 rounded-xl shadow-[0_0_24px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_32px_hsl(var(--primary)/0.5)] transition"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
            Desbloquear Acesso Completo
          </Button>
          
          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">
            Pagamento Seguro via Stripe
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
