import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "@/contexts/GameContext";
import { BossProvider } from "@/contexts/BossContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Skills from "./pages/Skills";
import Missions from "./pages/Missions";
import Inventory from "./pages/Inventory";
import Resources from "./pages/Resources";
import Diet from "./pages/Diet";
import MealDetail from "./pages/MealDetail";
import Ranking from "./pages/Ranking";
import Profile from "./pages/Profile";
import SettingsHub from "./pages/settings/SettingsHub";
import ProfileSettings from "./pages/settings/ProfileSettings";
import GameplaySettings from "./pages/settings/GameplaySettings";
import AppearanceSettings from "./pages/settings/AppearanceSettings";
import IntegrationsSettings from "./pages/settings/IntegrationsSettings";
import DataSettings from "./pages/settings/DataSettings";
import StatisticsSettings from "./pages/settings/StatisticsSettings";
import FragmentsSettings from "./pages/settings/FragmentsSettings";
import SupportSettings from "./pages/settings/SupportSettings";
import AccountSettings from "./pages/settings/AccountSettings";
import LegalSettings from "./pages/settings/LegalSettings";
import { GlobalAchievementPopup } from "@/components/achievements/GlobalAchievementPopup";
import Bosses from "./pages/Bosses";
import BossDetail from "./pages/BossDetail";
import Training from "./pages/Training";
import TrainingDay from "./pages/TrainingDay";
import Shop from "./pages/Shop";
import Agenda from "./pages/Agenda";
import Achievements from "./pages/Achievements";
import Journal from "./pages/Journal";
import NotFound from "./pages/NotFound";
import OnboardingPreview from "./pages/OnboardingPreview";
import TestAuth from "./pages/TestAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
          <GameProvider>
            <BossProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/test-auth" element={<TestAuth />} />
              <Route path="/onboarding-preview" element={<OnboardingPreview />} />
              <Route path="/skills" element={<ProtectedRoute><Skills /></ProtectedRoute>} />
              <Route path="/missions" element={<ProtectedRoute><Missions /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
              <Route path="/diet" element={<ProtectedRoute><Diet /></ProtectedRoute>} />
              <Route path="/diet/meal/:id" element={<ProtectedRoute><MealDetail /></ProtectedRoute>} />
              <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
              <Route path="/bosses" element={<ProtectedRoute><Bosses /></ProtectedRoute>} />
              <Route path="/bosses/:id" element={<ProtectedRoute><BossDetail /></ProtectedRoute>} />
              <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
              <Route path="/training/:day" element={<ProtectedRoute><TrainingDay /></ProtectedRoute>} />
              <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
              <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsHub /></ProtectedRoute>} />
              <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
              <Route path="/settings/gameplay" element={<ProtectedRoute><GameplaySettings /></ProtectedRoute>} />
              <Route path="/settings/appearance" element={<ProtectedRoute><AppearanceSettings /></ProtectedRoute>} />
              <Route path="/settings/integrations" element={<ProtectedRoute><IntegrationsSettings /></ProtectedRoute>} />
              <Route path="/settings/data" element={<ProtectedRoute><DataSettings /></ProtectedRoute>} />
              <Route path="/settings/statistics" element={<ProtectedRoute><StatisticsSettings /></ProtectedRoute>} />
              <Route path="/settings/fragments" element={<ProtectedRoute><FragmentsSettings /></ProtectedRoute>} />
              <Route path="/settings/support" element={<ProtectedRoute><SupportSettings /></ProtectedRoute>} />
              <Route path="/settings/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
              <Route path="/settings/legal" element={<ProtectedRoute><LegalSettings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <GlobalAchievementPopup />
          </BrowserRouter>
          </BossProvider>
          </GameProvider>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
