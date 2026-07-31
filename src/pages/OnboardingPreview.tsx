import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { toast } from 'sonner';

/**
 * Dev-only route: /onboarding-preview
 * Renders the onboarding flow in isolation, ignoring auth and first-access checks.
 * State is not persisted — completing here just shows a toast and resets.
 */
const OnboardingPreview = () => {
  return (
    <OnboardingWizard
      onComplete={(data) => {
        toast.success(`Onboarding preview concluído: ${data.name || 'sem nome'}`);
        // Reload to restart the flow from step 1
        setTimeout(() => window.location.reload(), 800);
      }}
    />
  );
};

export default OnboardingPreview;
