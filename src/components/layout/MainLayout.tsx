import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';
import { useGame } from '@/contexts/GameContext';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { levelUpData, dismissLevelUp } = useGame();
  const location = useLocation();

  return (
    <div className="min-h-screen relative">
      <Sidebar />
      <BottomNav />
      <main className="md:ml-64 min-h-screen pt-4 pb-24 px-3 md:pt-8 md:px-8 md:pb-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <LevelUpOverlay
        level={levelUpData.level}
        show={levelUpData.show}
        onComplete={dismissLevelUp}
      />
    </div>
  );
}
