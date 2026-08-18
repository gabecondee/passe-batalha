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
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Erro ao checar assinatura:', error);
        setStatus('error');
        return;
      }

      setStatus(data ? 'active' : 'inactive');
    }

    check();
    
    return () => { 
      cancelled = true; 
    };
  }, [userId]);

  return status;
}
