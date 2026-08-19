import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionStatus = 'checking' | 'active' | 'inactive' | 'error';

export function useSubscriptionStatus(userId: string | null | undefined): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>('checking');

  useEffect(() => {
    if (!userId) {
      setStatus('checking');
      return;
    }

    let cancelled = false;

    async function check() {
      // Garantir que a sessão do Supabase (e os tokens) foram restaurados corretamente
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        // Sessão ainda não restaurada ou inexistente
        // O efeito rodará de novo quando user mudar/estabilizar
        return;
      }

      // Agora podemos consultar com segurança a tabela RLS
      const { data, error } = await supabase
        .from('cakto_subscriptions')
        .select('status, current_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Erro ao checar assinatura:', error);
        setStatus('error');
        return;
      }

      if (!data) {
        setStatus('inactive');
        return;
      }

      const GRACE_PERIOD_DAYS = 2;

      if (data.current_period_end) {
        const expiresAt = new Date(data.current_period_end).getTime();
        const graceDeadline = expiresAt + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

        if (Date.now() > graceDeadline) {
          setStatus('inactive');
          return;
        }
      }

      setStatus('active');
    }

    check();
    
    return () => { 
      cancelled = true; 
    };
  }, [userId]);

  return status;
}
