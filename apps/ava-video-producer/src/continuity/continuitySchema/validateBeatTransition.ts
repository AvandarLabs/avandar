import type { ContinuityBeat } from "./continuitySchema";
/** Check overlap and shared-object continuity. */
export function validateBeatTransition({
  beat,
  issue,
  previousBeat,
}: Readonly<{
  beat: ContinuityBeat;
  issue: (message: string) => void;
  previousBeat?: ContinuityBeat;
}>): void {
  if (beat.transition.kind === "cut" && beat.transition.frames !== 0) {
    issue("Cuts cannot overlap");
  }
  if (beat.transition.kind !== "cut" && beat.transition.frames === 0) {
    issue("Animated transitions need a duration");
  }
  if (
    ["handoff", "morph"].includes(beat.transition.kind) &&
    previousBeat !== undefined &&
    (!beat.token ||
      !previousBeat.token ||
      beat.token.label !== previousBeat.token?.label)
  ) {
    issue("Handoffs require the same identified object on both sides");
  }
}
