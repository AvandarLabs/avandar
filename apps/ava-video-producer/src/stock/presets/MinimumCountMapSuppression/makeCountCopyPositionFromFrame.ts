import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
/** Travel below adjacent count baselines and above the next row's captions. */
export function makeCountCopyPositionFromFrame({
  frame,
  index,
  motion,
}: Readonly<{
  frame: number;
  index: number;
  motion: VideoMotion;
}>): {
  x: number;
  y: number;
} {
  const progress = motion.ramp(
    frame,
    106 + index * motion.scaleStagger(2),
    motion.scale(23),
    motion.travel.easing,
  );
  const lateral = Math.max(0, Math.min(1, (progress - 0.2) / 0.6));
  const baseline = 248 + Math.floor(index / 2) * 100;
  return {
    x: Motion.mix({
      t: lateral,
      from: 125 + (index % 2) * 190,
      to: 635 + (index % 2) * 190,
    }),
    y:
      progress < 0.2
        ? Motion.mix({
            t: progress / 0.2,
            from: baseline,
            to: baseline + 25,
          })
        : progress > 0.8
          ? Motion.mix({
              t: (progress - 0.8) / 0.2,
              from: baseline + 25,
              to: baseline,
            })
          : baseline + 25,
  };
}
