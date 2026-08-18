import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const subStatus = useSubscriptionStatus(user?.id);

  if (isLoading || subStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c1830]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (subStatus === 'error') {
    // Falha ao verificar não deve derrubar a sessão do usuário.
    // Loga o erro e deixa passar (fail-open) em vez de expulsar alguém por soluço de rede.
    console.warn('Falha temporária ao verificar assinatura. Liberando acesso (fail-open).');
    return <>{children}</>;
  }

  if (subStatus === 'inactive') {
    // Apenas desloga e redireciona se tivermos certeza que a assinatura não está ativa
    supabase.auth.signOut();
    return <Navigate to="/assinatura-inativa" replace />;
  }

  // Se for 'active', libera a rota protegida
  return <>{children}</>;
};
