import { MuscleId } from '@/lib/workoutStorage';
import chest from '@/assets/muscles/chest.png';
import back from '@/assets/muscles/back.png';
import shoulders from '@/assets/muscles/shoulders.png';
import trapezius from '@/assets/muscles/trapezius.png';
import biceps from '@/assets/muscles/biceps.png';
import triceps from '@/assets/muscles/triceps.png';
import forearms from '@/assets/muscles/forearms.png';
import abs from '@/assets/muscles/abs.png';
import glutes from '@/assets/muscles/glutes.png';
import quads from '@/assets/muscles/quads.png';
import hamstrings from '@/assets/muscles/hamstrings.png';
import adductors from '@/assets/muscles/adductors.png';
import abductors from '@/assets/muscles/abductors.png';
import calves from '@/assets/muscles/calves.png';
import cardio from '@/assets/muscles/cardio.png';
import full_body from '@/assets/muscles/full_body.png';
import { cn } from '@/lib/utils';

const IMAGES: Record<MuscleId, string> = {
  chest,
  back,
  shoulders,
  trapezius,
  biceps,
  triceps,
  forearms,
  abs,
  glutes,
  quads,
  hamstrings,
  adductors,
  abductors,
  calves,
  cardio,
  full_body,
};

interface MuscleIconProps {
  id: MuscleId;
  active?: boolean;
  className?: string;
}

/**
 * Detailed AI-generated anatomical illustration.
 * Image is naturally on a black background with the target muscle glowing green.
 * Inactive state desaturates and dims the green highlight slightly.
 */
export function MuscleIcon({ id, active = false, className }: MuscleIconProps) {
  return (
    <img
      src={IMAGES[id]}
      alt=""
      aria-hidden="true"
      loading="lazy"
      draggable={false}
      className={cn(
        'h-full w-full object-contain transition-all duration-200',
        active
          ? 'opacity-100 [filter:drop-shadow(0_0_8px_hsl(140_90%_55%/0.5))]'
          : 'opacity-60 saturate-50',
        className,
      )}
    />
  );
}
