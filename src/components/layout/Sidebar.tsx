import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TreeDeciduous, 
  Target, 
  Backpack, 
  Trophy, 
  Skull,
  Menu,
  X,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isNavItemActive } from '@/lib/navModules';
import logoSrc from '@/assets/logo.png';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/skills', label: 'Habilidades', icon: TreeDeciduous },
  { path: '/missions', label: 'Missões', icon: Target },
  { path: '/inventory', label: 'Inventário', icon: Backpack },
  { path: '/bosses', label: 'Chefões', icon: Skull },
  { path: '/ranking', label: 'Ranking', icon: Trophy },
  { path: '/settings', label: 'Config', icon: Settings },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile sidebar completely hidden — BottomNav handles mobile */}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 z-40 transform transition-transform duration-300 ease-in-out",
        "hidden md:block",
        "bg-gradient-to-b from-card/95 to-background/95 backdrop-blur-md",
        "border-r border-primary/20",
      )}>
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-6 mb-4">
            <div className="w-16 h-16 shrink-0 rounded-full bg-background flex items-center justify-center border border-primary/30 overflow-hidden">
              <img src={logoSrc} alt="Passe de Batalha" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-[13px] font-bold text-primary leading-tight whitespace-nowrap">Passe de Batalha</h1>
              <p className="text-xs text-muted-foreground leading-snug mt-1">A vida é como um jogo,<br />apenas jogue!</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item.path, location.pathname);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "nav-link group",
                    isActive && "active"
                  )}
                  data-tour-id={
                    item.path === '/skills' ? 'tour-nav-skills' :
                    item.path === '/missions' ? 'tour-nav-missions' :
                    undefined
                  }
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  <span className={cn(
                    "transition-colors",
                    isActive && "text-primary"
                  )}>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="pt-4 border-t border-primary/20">
            <div className="px-4 py-2 text-xs text-muted-foreground">
              <p className="font-display tracking-wider">V 1.0 MVP</p>
              <p className="text-primary/60 mt-1">© Passe de Batalha - Todos os direitos reservados</p>
            </div>
          </div>
        </div>

        {/* Decorative line */}
        <div className="absolute right-0 top-0 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
      </aside>
    </>
  );
}
