import { supabase } from '@/integrations/supabase/client';

export const authService = {
  signUp: async ({ email, password }: any) => {
    return await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          name: email.split('@')[0], // Nome provisório para evitar erro de NOT NULL
          avatar: ''
        }
      }
    });
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
