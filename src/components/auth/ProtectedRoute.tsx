import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
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

  return <>{children}</>;
};
