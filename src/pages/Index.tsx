import Dashboard from './Dashboard';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useGame } from '@/contexts/GameContext';

const Index = () => {
  // Desativado temporariamente a pedido do usuário
  // const { hasCompletedOnboarding, completeOnboarding } = useGame();
  // if (!hasCompletedOnboarding) {
  //   return <OnboardingWizard onComplete={completeOnboarding} />;
  // }

  return <Dashboard />;
};

export default Index;
