import { ArrowLeft, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SettingsHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  backTo?: string;
}

export function SettingsHeader({ icon: Icon, title, subtitle, backTo }: SettingsHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <button
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>
      <div className="flex flex-col items-center text-center gap-2">
        <div className="flex items-center gap-3">
          <Icon className="w-8 h-8 md:w-10 md:h-10 text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.6)]" />
          <h1 className="font-display text-3xl md:text-4xl tracking-wider">
            <span className="text-gradient-gold uppercase">{title}</span>
          </h1>
        </div>
        {subtitle && (
          <p className="text-sm md:text-base text-muted-foreground max-w-md">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
