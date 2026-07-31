import { Attribute } from '@/types/game';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';

interface AttributeRadarProps {
  attributes: Attribute[];
}

export function AttributeRadar({ attributes }: AttributeRadarProps) {
  const data = attributes.map(attr => ({
    subject: attr.name,
    value: attr.level,
    fullMark: 20,
  }));

  return (
    <div className="fantasy-card p-6">
      <h3 className="font-display text-lg mb-4 text-center tracking-wider">
        <span className="text-gradient-cyan">STATS OVERVIEW</span>
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid 
              stroke="hsl(195 100% 50% / 0.2)" 
              strokeDasharray="3 3"
            />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: 'hsl(200 20% 80%)', fontSize: 11, fontWeight: 500 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 20]} 
              tick={{ fill: 'hsl(200 15% 55%)', fontSize: 10 }}
              axisLine={false}
            />
            <Radar
              name="Nível"
              dataKey="value"
              stroke="hsl(195 100% 55%)"
              fill="hsl(195 100% 50%)"
              fillOpacity={0.25}
              strokeWidth={2}
              style={{
                filter: 'drop-shadow(0 0 8px hsl(195 100% 50% / 0.5))',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
