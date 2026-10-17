import { MuscleId } from '@/lib/workoutStorage';
import chest from '@/assets/muscles/chest.webp';
import back from '@/assets/muscles/back.webp';
import shoulders from '@/assets/muscles/shoulders.webp';
import trapezius from '@/assets/muscles/trapezius.webp';
import biceps from '@/assets/muscles/biceps.webp';
import triceps from '@/assets/muscles/triceps.webp';
import forearms from '@/assets/muscles/forearms.webp';
import abs from '@/assets/muscles/abs.webp';
import glutes from '@/assets/muscles/glutes.webp';
import quads from '@/assets/muscles/quads.webp';
import hamstrings from '@/assets/muscles/hamstrings.webp';
import adductors from '@/assets/muscles/adductors.webp';
import abductors from '@/assets/muscles/abductors.webp';
import calves from '@/assets/muscles/calves.webp';
import cardio from '@/assets/muscles/cardio.webp';
import full_body from '@/assets/muscles/full_body.webp';
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
      decoding="async"
      width={256}
      height={256}
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
