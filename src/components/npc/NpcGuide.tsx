import { motion } from 'framer-motion';
import npcImage from '@/assets/npc-guide.png';

interface NpcGuideProps {
  /** Whether the NPC is visible */
  visible?: boolean;
  /** Optional className for positioning overrides */
  className?: string;
}

/**
 * Reusable NPC Guide character component.
 * Displays an anime-style mentor with idle floating animation and subtle energy aura.
 * Designed to be modular for future skins/characters.
 */
export function NpcGuide({ visible = true, className = '' }: NpcGuideProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.8 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`pointer-events-none select-none ${className}`}
    >
      {/* Aura glow behind the character */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-28 h-28 rounded-full bg-primary/25 blur-[50px]" />
      </motion.div>

      {/* Character — upper body only, transparent, with breathing + float animation */}
      <div className="relative overflow-hidden" style={{ height: '100px' }}>
        <motion.img
          src={npcImage}
          alt="NPC Guia"
          className="relative z-10 w-36 h-auto drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
          style={{
            mixBlendMode: 'lighten',
            maskImage: 'linear-gradient(to bottom, black 50%, transparent 90%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 90%)',
          }}
          animate={{
            y: [0, -5, 0],
            scale: [1, 1.02, 1],
            rotate: [0, 0.5, -0.5, 0],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </motion.div>
  );
}
