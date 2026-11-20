import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./VoluntaryFamilyReunion.schema";

type ReunionHand = { accepting: boolean; handX: number; handY: number };

/** The invitation hand gives way to the authored greeting after acceptance. */
export function getReunionHandFromFrame({
  index,
  frame,
  groupIndex,
  input,
  x,
  y,
  side,
  greeting,
  motion,
}: Readonly<{
  index: number;
  frame: number;
  groupIndex: number;
  input: Input;
  x: number;
  y: number;
  side: number;
  greeting: number;
  motion: VideoMotion;
}>): ReunionHand {
  const accepting =
    index === 0 &&
    frame >= 28 + groupIndex * motion.scaleStagger(18) &&
    frame <= 40 + groupIndex * motion.scaleStagger(18);
  const acceptProgress = motion.ramp(
    frame,
    28 + groupIndex * motion.scaleStagger(18),
    motion.whip,
    motion.travel.easing,
  );
  const handX = accepting
    ? mix(acceptProgress, x + 18, groupIndex === 0 ? 246 : 866)
    : x + side * (input.greeting === "wave" ? 22 : 34) * greeting;
  const handY = accepting
    ? mix(acceptProgress, y - 28, 282)
    : y - 28 - (input.greeting === "wave" ? 36 : 8) * greeting;
  return { accepting, handX, handY };
}
