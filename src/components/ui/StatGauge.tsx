import { cn } from '@/lib/utils';

interface StatGaugeProps {
  value: number;
  max: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'orange' | 'purple' | 'green';
  className?: string;
}

const sizeConfig = {
  sm: { size: 60, stroke: 4, fontSize: 'text-sm' },
  md: { size: 80, stroke: 5, fontSize: 'text-lg' },
  lg: { size: 100, stroke: 6, fontSize: 'text-xl' },
};

const colorConfig = {
  cyan: {
    stroke: 'stroke-[hsl(var(--primary))]',
    glow: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.8))',
    text: 'text-[hsl(var(--primary))]',
  },
  orange: {
    stroke: 'stroke-orange-400',
    glow: 'drop-shadow(0 0 8px hsl(30 100% 55% / 0.8))',
    text: 'text-orange-300',
  },
  purple: {
    stroke: 'stroke-[hsl(var(--accent))]',
    glow: 'drop-shadow(0 0 8px hsl(var(--accent) / 0.8))',
    text: 'text-[hsl(var(--accent))]',
  },
  green: {
    stroke: 'stroke-emerald-400',
    glow: 'drop-shadow(0 0 8px hsl(160 70% 50% / 0.8))',
    text: 'text-emerald-300',
  },
};

export function StatGauge({ 
  value, 
  max, 
  label, 
  size = 'md', 
  color = 'cyan',
  className 
}: StatGaugeProps) {
  const config = sizeConfig[size];
  const colorStyle = colorConfig[color];
  const percentage = Math.min(100, (value / max) * 100);
  
  const radius = (config.size - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: config.size, height: config.size }}>
        <svg
          width={config.size}
          height={config.size}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke="hsl(220 25% 15%)"
            strokeWidth={config.stroke}
          />
          {/* Progress ring */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            className={colorStyle.stroke}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ 
              transition: 'stroke-dashoffset 0.5s ease',
              filter: colorStyle.glow,
            }}
          />
          {/* Tick marks */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x1 = config.size / 2 + (radius - 4) * Math.cos(angle);
            const y1 = config.size / 2 + (radius - 4) * Math.sin(angle);
            const x2 = config.size / 2 + (radius + 2) * Math.cos(angle);
            const y2 = config.size / 2 + (radius + 2) * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth={1}
              />
            );
          })}
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-display font-bold', config.fontSize, colorStyle.text)}>
            {value}
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}
