import { ChevronRight, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}

export function SettingsCard({ icon: Icon, title, description, to, onClick, danger }: SettingsCardProps) {
  const navigate = useNavigate();
  const handle = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
  };
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={handle}
      className={cn(
        'fantasy-card w-full flex items-center gap-4 p-4 md:p-5 text-left transition-all duration-300 group',
        'hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)]',
        danger && 'hover:shadow-[0_0_20px_hsl(var(--destructive)/0.35)]'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-14 h-14 shrink-0 rounded-xl border',
          danger
            ? 'bg-destructive/10 border-destructive/50'
            : 'bg-primary/10 border-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.25)]'
        )}
      >
        <Icon className={cn('w-6 h-6', danger ? 'text-destructive' : 'text-primary')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display uppercase tracking-wider text-sm md:text-base">{title}</p>
        <p className="text-xs md:text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight
        className={cn(
          'w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1',
          danger ? 'text-destructive/70' : 'text-muted-foreground'
        )}
      />
    </motion.button>
  );
}
