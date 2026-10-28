import { getContinuityTimeline } from "../../continuity/continuityTimeline";
import type { shotSchema } from "./shotSchema";
import type { z } from "zod";
type Shot = z.infer<typeof shotSchema>;

type Options = { shot: Shot | undefined; beatId?: string };

/** Resolve a narration window from a shot or one overlap-aware continuity beat. */
export function getCueWindowFromShot({ shot, beatId }: Options) {
  if (!shot) throw new Error("Narration references an unknown shot");
  if (!beatId) return { start: 0, duration: shot.durationInFrames };
  if (shot.scene !== "continuity")
    throw new Error("Only continuity shots have beats");
  const index = shot.props.beats.findIndex((beat) => beat.id === beatId);
  if (index < 0)
    throw new Error("Narration references an unknown continuity beat");
  return {
    start: getContinuityTimeline(shot.props.beats)[index].start,
    duration: shot.props.beats[index].duration,
  };
}
