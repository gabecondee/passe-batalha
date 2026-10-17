import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let version = 0;
    // Subscribe first so a late initial read cannot restore an already ended session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        ++version;
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    const initializeAuth = async () => {
      const request = ++version;
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (active && request === version && !error) setUser(session?.user ?? null);
      } catch {
        // A network failure is not evidence that an existing session ended.
      } finally {
        if (active && request === version) setIsLoading(false);
      }
    };

    void initializeAuth();
    const focused = () => { void initializeAuth(); };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith('sb-')) void initializeAuth();
    };
    window.addEventListener('focus', focused);
    window.addEventListener('storage', storageChanged);

    return () => {
      active = false;
      ++version;
      subscription.unsubscribe();
      window.removeEventListener('focus', focused);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
