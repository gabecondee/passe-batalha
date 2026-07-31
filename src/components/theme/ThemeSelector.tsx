import { motion } from 'framer-motion';
import { Check, Palette } from 'lucide-react';
import { useTheme, ThemeDefinition } from '@/contexts/ThemeContext';

function ThemeCard({ theme, isActive, onSelect }: { 
  theme: ThemeDefinition; 
  isActive: boolean; 
  onSelect: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 text-left w-full ${
        isActive
          ? 'border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.3)]'
          : 'border-border bg-card hover:border-muted-foreground/30'
      }`}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      {/* Color preview circles */}
      <div className="flex gap-2">
        {theme.previewColors.map((color, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full border border-white/10"
            style={{ 
              backgroundColor: color,
              boxShadow: i === 0 ? `0 0 12px ${color}` : undefined,
            }}
          />
        ))}
      </div>

      {/* Info */}
      <div className="text-center">
        <span className="text-lg mr-1">{theme.icon}</span>
        <span className="font-display text-sm tracking-wider">{theme.name}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{theme.subtitle}</p>
      </div>
    </motion.button>
  );
}

export function ThemeSelector() {
  const { currentTheme, setTheme, themes } = useTheme();

  return (
    <div className="fantasy-card p-6">
      <h3 className="font-display text-lg mb-4 flex items-center gap-2">
        <Palette className="w-5 h-5 text-primary" />
        Aparência
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Escolha a skin do seu personagem. A troca é instantânea.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={currentTheme === theme.id}
            onSelect={() => setTheme(theme.id)}
          />
        ))}
      </div>
    </div>
  );
}
