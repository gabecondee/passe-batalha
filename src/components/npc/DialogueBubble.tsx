import { motion } from 'framer-motion';

interface DialogueBubbleProps {
  /** The NPC's dialogue text */
  text: string;
  /** NPC name displayed as label */
  name?: string;
  /** Optional className */
  className?: string;
}

/**
 * Dialogue bubble component for NPC narration.
 * Styled as a game-style speech box with typing-reveal animation.
 */
export function DialogueBubble({ text, name = 'Kaelen', className = '' }: DialogueBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative max-w-xs ${className}`}
    >
      {/* Bubble container */}
      <div className="relative bg-card/95 backdrop-blur-md border border-primary/30 rounded-xl px-5 py-4 shadow-[0_0_30px_hsl(195_100%_50%/0.15)]">
        {/* Name tag */}
        <div className="absolute -top-3 left-4 px-3 py-0.5 bg-primary/20 border border-primary/40 rounded-full">
          <span className="text-xs font-display tracking-wider text-primary">{name}</span>
        </div>

        {/* Dialogue text with character-by-character reveal */}
        <motion.p
          className="text-sm text-foreground/90 leading-relaxed mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {text}
        </motion.p>
      </div>

      {/* Speech tail pointing down-left */}
      <div className="absolute -bottom-2 left-8 w-4 h-4 bg-card/95 border-b border-r border-primary/30 rotate-45" />
    </motion.div>
  );
}
