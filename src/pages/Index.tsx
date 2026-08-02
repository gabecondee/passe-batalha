import { useEffect, useState } from 'react';
import Dashboard from './Dashboard';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const { completeOnboarding } = useGame();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    async function checkOnboarding() {
      if (authLoading) return;
      
      if (!user) {
        setHasCompletedOnboarding(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          setHasCompletedOnboarding(false);
        } else {
          setHasCompletedOnboarding(!!data.onboarding_completed);
        }
      } catch (err) {
        console.error('Failed to check onboarding status:', err);
        setHasCompletedOnboarding(false);
      } finally {
        setLoading(false);
      }
    }
    checkOnboarding();
  }, [user, authLoading]);

  const handleComplete = (data: { name: string; avatar: string | null }) => {
    completeOnboarding(data);
    setHasCompletedOnboarding(true);
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0c1830]">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingWizard onComplete={handleComplete} />;
  }

  return <Dashboard />;
};

export default Index;
