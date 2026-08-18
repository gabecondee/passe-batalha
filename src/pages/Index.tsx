import { useEffect, useState, useCallback } from 'react';
import Dashboard from './Dashboard';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { SetPassword } from '@/components/auth/SetPassword';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasPasswordSet, setHasPasswordSet] = useState(true);
  const { completeOnboarding } = useGame();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    async function checkOnboarding() {
      if (authLoading) return;
      
      if (!user) {
        setHasCompletedOnboarding(false);
        setHasPasswordSet(true); // Don't show SetPassword if not logged in
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, password_set')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          setHasCompletedOnboarding(false);
          setHasPasswordSet(true); // default to true to avoid locking out if data is missing
        } else {
          setHasCompletedOnboarding(!!data.onboarding_completed);
          setHasPasswordSet(data.password_set !== false);
        }
      } catch (err) {
        console.error('Failed to check onboarding status:', err);
        setHasCompletedOnboarding(false);
        setHasPasswordSet(true);
      } finally {
        setLoading(false);
      }
    }
    checkOnboarding();
  }, [user, authLoading]);

  const handleCompleteOnboarding = useCallback((data: { name: string; avatar: string | null; initialSkills?: Record<string, number>; class?: string }) => {
    completeOnboarding(data);
    setHasCompletedOnboarding(true);
  }, [completeOnboarding]);

  const handlePasswordSet = useCallback(() => {
    setHasPasswordSet(true);
  }, []);

  if (loading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0c1830]">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  // If user is logged in (has session) but hasn't set password, show SetPassword
  if (user && !hasPasswordSet) {
    return <SetPassword onComplete={handlePasswordSet} />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingWizard onComplete={handleCompleteOnboarding} />;
  }

  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
};

export default Index;
