import { prop } from "@avandar/utils";
import { type Storyboard } from "../../src/storyboard/schema/schema";
import { StoryboardTimeline } from "../../src/storyboard/schema/StoryboardTimeline";
import { getAssetReferencesFromPlan } from "../lib/planHelpers/planHelpers";
/** The JSON the `validate` command prints for a plan that passed. */
export function makeValidationSummaryFromStoryboard(plan: Storyboard): string {
  return JSON.stringify(
    {
      valid: true,
      id: plan.id,
      shots: plan.shots.length,
      frames: StoryboardTimeline.durationInFrames(plan),
      seconds: StoryboardTimeline.durationInFrames(plan) / plan.fps,
      assets: getAssetReferencesFromPlan(plan).length,
      narration: plan.narrationTrack
        ? "provided track"
        : plan.narration.some(prop("audio"))
          ? "per-cue recordings"
          : "text only",
    },
    null,
    2,
  );
}
