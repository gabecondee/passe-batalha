import { supabase } from '@/integrations/supabase/client';

export const authService = {
  signUp: async ({ email, password }: any) => {
    return await supabase.auth.signUp({ email, password });
  },
  signIn: async ({ email, password }: any) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },
  signOut: async () => {
    return await supabase.auth.signOut();
  },
  getUser: async () => {
    return await supabase.auth.getUser();
  }
};
