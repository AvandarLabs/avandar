import { ContinuityTimeline } from "../ContinuityTimeline/ContinuityTimeline";
import type { ContinuityPlan } from "../continuitySchema/continuitySchema";
/** Find the active beat and its incoming token using overlap-aware starts. */
export function getContinuityTokenBeat({
  plan,
  frame,
}: Readonly<{ plan: ContinuityPlan; frame: number }>): {
  beat: ContinuityPlan["beats"][number];
  timing: ReturnType<typeof ContinuityTimeline.getContinuityTimeline>;
  index: number;
} {
  const timing = ContinuityTimeline.getContinuityTimeline(plan.beats);
  const index = Math.max(
    0,
    timing.reduce((found, entry, position) => {
      return frame >= entry.start ? position : found;
    }, 0),
  );
  const beat = plan.beats[index];
  return { beat, timing, index };
}
