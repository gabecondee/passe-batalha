import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Brain, Sparkle, Briefcase, DollarSign } from 'lucide-react';
import { Attribute, AttributeType } from '@/types/game';
import { cn } from '@/lib/utils';

const ORDER: AttributeType[] = ['physical', 'mental', 'spiritual', 'professional', 'financial'];

const LABELS: Record<AttributeType, string> = {
  physical: 'Física',
  mental: 'Mental',
  spiritual: 'Espiritual',
  professional: 'Profissional',
  financial: 'Financeira',
};

const COLORS: Record<AttributeType, string> = {
  physical: '#3b82f6',
  mental: '#a855f7',
  spiritual: '#facc15',
  professional: '#22c55e',
  financial: '#f59e0b',
};

const ICONS: Record<AttributeType, typeof Dumbbell> = {
  physical: Dumbbell,
  mental: Brain,
  spiritual: Sparkle,
  professional: Briefcase,
  financial: DollarSign,
};

const MAX = 20;

export function SkillsRadar({ attributes }: { attributes: Attribute[] }) {
  const [hovered, setHovered] = useState<AttributeType | null>(null);

  const byType: Record<string, Attribute | undefined> = {};
  attributes.forEach((a) => {
    byType[a.type] = a;
  });

  const size = 360;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = 130;
  const angleFor = (i: number) => (Math.PI * 2 * i) / ORDER.length - Math.PI / 2;

  const axisPoint = (i: number, r = radius) => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const point = (i: number, v: number) => axisPoint(i, (v / MAX) * radius);

  // Radar shows RELATIVE development between skills, not absolute XP.
  // Polygon stays within a fixed band (10%-70% of radius) regardless of XP scale.
  const RAIO_MIN = 0.10;
  const RAIO_MAX = 0.70;
  const xps = ORDER.map((k) => byType[k]?.xp ?? 0);
  const maxXp = Math.max(...xps, 1);
  const fractionFor = (xp: number) => {
    const normalized = maxXp > 0 ? xp / maxXp : 0;
    return RAIO_MIN + normalized * (RAIO_MAX - RAIO_MIN);
  };

  // Compute vertex positions; memoize so framer-motion animates on XP changes.
  const vertices = useMemo(
    () =>
      ORDER.map((k, i) => {
        const [x, y] = axisPoint(i, radius * fractionFor(byType[k]?.xp ?? 0));
        return { k, x, y };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [xps.join(',')],
  );
  const polygonPoints = vertices.map((v) => `${v.x},${v.y}`).join(' ');

  const ringPoints = (frac: number) =>
    ORDER.map((_, i) => axisPoint(i, radius * frac).join(',')).join(' ');

  // Labels sit centered over each icon, matching the reference layout.
  const labelOffsets: { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }[] = [
    { dx: 0, dy: -32, anchor: 'middle' }, // Física (centered above icon)
    { dx: 0, dy: -32, anchor: 'middle' }, // Mental (centered above icon)
    { dx: 0, dy: 34, anchor: 'middle' },  // Espiritual (centered below icon)
    { dx: 0, dy: 34, anchor: 'middle' },  // Profissional (centered below icon)
    { dx: 0, dy: -32, anchor: 'middle' }, // Financeira (centered above icon)
  ];

  const hoveredAttr = hovered ? byType[hovered] : null;
  const hoveredIndex = hovered ? ORDER.indexOf(hovered) : -1;
  const tipPos = hoveredIndex >= 0 ? axisPoint(hoveredIndex, radius + 4) : null;

  // Mental (top-right) and Spiritual (bottom-right) tooltips are flipped to the
  // left of their icon so they stay fully visible inside the viewport.
  const flipX = hovered === 'mental' || hovered === 'spiritual' ? 'right' : 'center';

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${size} ${size + 20}`} className="w-full h-auto overflow-visible">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon
            key={f}
            points={ringPoints(f)}
            fill="none"
            stroke="rgba(148,163,184,0.25)"
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
        ))}
        {ORDER.map((_, i) => {
          const [x, y] = axisPoint(i);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(148,163,184,0.18)" strokeWidth={0.8} />;
        })}

        <motion.polygon
          points={polygonPoints}
          fill="rgba(34,211,238,0.18)"
          stroke="#22d3ee"
          strokeWidth={2.5}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, points: polygonPoints } as any}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.7))' }}
        />

        {/* Vertex dots at each corner of the filled polygon, animated in real time */}
        {vertices.map((v) => (
          <motion.circle
            key={`dot-${v.k}`}
            initial={false}
            animate={{ cx: v.x, cy: v.y }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            r={4}
            fill="#22d3ee"
            style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.9))' }}
          />
        ))}

        {ORDER.map((k, i) => {
          const [x, y] = axisPoint(i);
          const color = COLORS[k];
          const Icon = ICONS[k];
          const active = hovered === k;
          return (
            <g
              key={k}
              onMouseEnter={() => setHovered(k)}
              onMouseLeave={() => setHovered((h) => (h === k ? null : h))}
              onTouchStart={() => setHovered(k)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={x}
                cy={y}
                r={active ? 20 : 17}
                fill="#05080f"
                stroke={color}
                strokeWidth={active ? 2.2 : 1.8}
                style={{ filter: `drop-shadow(0 0 ${active ? 12 : 8}px ${color}${active ? 'cc' : 'aa'})`, transition: 'all 0.2s' }}
              />
              <foreignObject x={x - 10} y={y - 10} width={20} height={20} pointerEvents="none">
                <div style={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                  <Icon size={15} />
                </div>
              </foreignObject>
              <circle cx={x} cy={y} r={24} fill="transparent" />
            </g>
          );
        })}

        {ORDER.map((k, i) => {
          const off = labelOffsets[i];
          const [x, y] = axisPoint(i);
          const color = COLORS[k];
          return (
            <text
              key={`l-${k}`}
              x={x + off.dx}
              y={y + off.dy}
              textAnchor={off.anchor}
              fill={color}
              fontSize="11"
              fontFamily="Inter, sans-serif"
              fontWeight={700}
              letterSpacing="0.8"
              style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
            >
              {LABELS[k].toUpperCase()}
            </text>
          );
        })}
      </svg>

      <AnimatePresence>
        {hovered && hoveredAttr && tipPos && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute"
            style={{
              left: `${(tipPos[0] / size) * 100}%`,
              top: `${(tipPos[1] / (size + 10)) * 100}%`,
            }}
          >
            <div
              className={cn(
                'pointer-events-none -translate-y-full px-3 py-1.5 rounded-lg border text-[11px] font-medium whitespace-nowrap',
                flipX === 'right' && '-translate-x-full',
                flipX === 'center' && '-translate-x-1/2'
              )}
              style={{
                background: 'rgba(5,8,15,0.95)',
                borderColor: `${COLORS[hovered]}66`,
                color: COLORS[hovered],
                boxShadow: `0 0 12px ${COLORS[hovered]}55`,
              }}
            >
              {LABELS[hovered]} · {hoveredAttr.xp} XP
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
