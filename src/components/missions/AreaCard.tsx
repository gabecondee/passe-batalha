import { AttributeType, Mission } from '@/types/game';
import { cn } from '@/lib/utils';

import areaPhysical from '@/assets/area-physical.jpg';
import areaMental from '@/assets/area-mental.jpg';
import areaProfessional from '@/assets/area-professional.jpg';
import areaSpiritual from '@/assets/area-spiritual.jpg';
import areaFinancial from '@/assets/area-financial.jpg';

interface AreaCardProps {
  attribute: AttributeType;
  missions: Mission[];
  onClick: () => void;
}

const areaConfig: Record<AttributeType, {
  label: string;
  image: string;
  colorClass: string;
  borderClass: string;
}> = {
  physical: {
    label: 'Física',
    image: areaPhysical,
    colorClass: 'text-physical',
    borderClass: 'border-physical/30 hover:border-physical/60',
  },
  mental: {
    label: 'Mental',
    image: areaMental,
    colorClass: 'text-mental',
    borderClass: 'border-mental/30 hover:border-mental/60',
  },
  professional: {
    label: 'Profissional',
    image: areaProfessional,
    colorClass: 'text-professional',
    borderClass: 'border-professional/30 hover:border-professional/60',
  },
  spiritual: {
    label: 'Espiritual',
    image: areaSpiritual,
    colorClass: 'text-spiritual',
    borderClass: 'border-spiritual/30 hover:border-spiritual/60',
  },
  financial: {
    label: 'Financeiro',
    image: areaFinancial,
    colorClass: 'text-financial',
    borderClass: 'border-financial/30 hover:border-financial/60',
  },
};

export function AreaCard({ attribute, missions, onClick }: AreaCardProps) {
  const config = areaConfig[attribute];
  const active = missions.filter(m => m.status !== 'completed').length;
  const completed = missions.filter(m => m.status === 'completed').length;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border-2 transition-all duration-300",
        "group cursor-pointer text-left",
        config.borderClass
      )}
    >
      {/* Background image */}
      <div className="relative h-40">
        <img
          src={config.image}
          alt={config.label}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className={cn("font-display text-lg mb-1", config.colorClass)}>
          {config.label}
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Missões: <span className="text-foreground font-medium">{active}</span></span>
          <span>Concluídas: <span className="text-foreground font-medium">{completed}</span></span>
        </div>
      </div>
    </button>
  );
}
