import { makeIdLookupMap } from "@avandar/utils";
import { getCueWindowFromShot } from "../../getCueWindowFromShot";
import type {
  StoryboardIssue,
  StoryboardPlan,
} from "./storyboardValidation.types";
/** Checks cue windows and ordering without skipping later valid cues. */
export function validateStoryboardNarration({
  plan,
  starts,
  issue,
}: Readonly<{
  plan: Readonly<StoryboardPlan>;
  starts: ReadonlyMap<string, number>;
  issue: StoryboardIssue;
}>): void {
  const shotsById = makeIdLookupMap(plan.shots);
  let lastEnd = -1;
  plan.narration.forEach((item) => {
    const shot = shotsById.get(item.shotId);
    const window = (() => {
      try {
        return getCueWindowFromShot({ shot, beatId: item.beatId });
      } catch {
        issue(`${item.id}: unknown continuity beat`);
        return { start: 0, duration: shot?.durationInFrames ?? 0 };
      }
    })();
    if (
      !shot ||
      item.endFrame <= item.startFrame ||
      item.endFrame > window.duration
    ) {
      issue(`${item.id}: cue must fit its referenced shot`);
      return;
    }
    const start = starts.get(item.shotId)! + window.start + item.startFrame;
    if (start < lastEnd) {
      issue("Narration cues must be chronological and non-overlapping");
    }
    lastEnd = starts.get(item.shotId)! + window.start + item.endFrame;
    if (plan.narrationTrack && item.audio) {
      issue("Choose one narration track or per-cue recordings, not both");
    }
  });
}
