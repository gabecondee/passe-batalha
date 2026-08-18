import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const [subLoading, setSubLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    if (!user) {
      setSubLoading(false);
      return;
    }
    
    supabase
      .from('cakto_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        setHasActiveSubscription(!!data);
        setSubLoading(false);
      });
  }, [user]);

  if (isLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02030a]">
        <div className="flex flex-col items-center gap-4 text-amber-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm tracking-widest font-semibold uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!hasActiveSubscription) {
    supabase.auth.signOut();
    return <Navigate to="/assinatura-inativa" replace />;
  }

  return <>{children}</>;
};
