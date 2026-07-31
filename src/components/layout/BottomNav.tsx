import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TreeDeciduous, 
  Target, 
  Backpack, 
  BarChart3, 
  Skull,
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isNavItemActive } from '@/lib/navModules';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/skills', label: 'Skills', icon: TreeDeciduous },
  { path: '/missions', label: 'Missões', icon: Target },
  { path: '/bosses', label: 'Chefões', icon: Skull },
  { path: '/inventory', label: 'Inventário', icon: Backpack },
  { path: '/ranking', label: 'Ranking', icon: BarChart3 },
  { path: '/settings', label: 'Config', icon: Settings },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glow line on top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      {/* Background */}
      <div className="bg-card/95 backdrop-blur-xl border-t border-primary/15 px-0.5 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = isNavItemActive(item.path, location.pathname);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center gap-0.5 w-full h-full relative"
              >
                <div className="relative flex items-center justify-center">
                  <item.icon className={cn(
                    "w-[18px] h-[18px] transition-all duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} style={isActive ? { filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.9)) drop-shadow(0 0 12px hsl(var(--primary) / 0.6))' } : undefined} />
                </div>


                <span className={cn(
                  "text-[9px] leading-none",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
