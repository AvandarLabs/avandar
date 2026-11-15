import { EASE, mix, ramp } from "../../../motion";
/** Travel below adjacent count baselines and above the next row's captions. */
export function makeCountCopyPositionFromFrame({
  frame,
  index,
}: Readonly<{ frame: number; index: number }>): { x: number; y: number } {
  const progress = ramp(frame, 106 + index * 2, 23, EASE.inOut);
  const lateral = Math.max(0, Math.min(1, (progress - 0.2) / 0.6));
  const baseline = 248 + Math.floor(index / 2) * 100;
  return {
    x: mix(lateral, 125 + (index % 2) * 190, 635 + (index % 2) * 190),
    y:
      progress < 0.2
        ? mix(progress / 0.2, baseline, baseline + 25)
        : progress > 0.8
          ? mix((progress - 0.8) / 0.2, baseline + 25, baseline)
          : baseline + 25,
  };
}
