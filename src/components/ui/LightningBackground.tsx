import { useEffect, useState } from 'react';

interface LightningBolt {
  id: number;
  left: string;
  delay: number;
  duration: number;
}

export function LightningBackground() {
  const [bolts, setBolts] = useState<LightningBolt[]>([]);

  useEffect(() => {
    // Generate random lightning positions
    const generateBolts = () => {
      const newBolts: LightningBolt[] = [];
      for (let i = 0; i < 3; i++) {
        newBolts.push({
          id: i,
          left: `${10 + Math.random() * 80}%`,
          delay: Math.random() * 5,
          duration: 4 + Math.random() * 3,
        });
      }
      setBolts(newBolts);
    };

    generateBolts();
    const interval = setInterval(generateBolts, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Lightning bolts */}
      {bolts.map((bolt) => (
        <div
          key={bolt.id}
          className="absolute top-0 w-px h-full opacity-0"
          style={{
            left: bolt.left,
            animation: `lightning-flash ${bolt.duration}s ease-in-out ${bolt.delay}s infinite`,
          }}
        >
          <svg
            viewBox="0 0 10 200"
            className="w-4 h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`lightning-gradient-${bolt.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(195 100% 70%)" stopOpacity="0.8" />
                <stop offset="50%" stopColor="hsl(195 100% 60%)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(195 100% 50%)" stopOpacity="0" />
              </linearGradient>
              <filter id={`glow-${bolt.id}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M5 0 L6 30 L4 35 L7 70 L3 75 L6 110 L4 115 L5 150 L3 155 L5 200"
              stroke={`url(#lightning-gradient-${bolt.id})`}
              strokeWidth="2"
              fill="none"
              filter={`url(#glow-${bolt.id})`}
            />
          </svg>
        </div>
      ))}

      {/* Grid lines overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(195 100% 50%) 1px, transparent 1px),
            linear-gradient(90deg, hsl(195 100% 50%) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      <style>{`
        @keyframes lightning-flash {
          0%, 100% { opacity: 0; }
          1% { opacity: 0.8; }
          2% { opacity: 0; }
          3% { opacity: 0.5; }
          4% { opacity: 0; }
          49% { opacity: 0; }
          50% { opacity: 0.6; }
          51% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
