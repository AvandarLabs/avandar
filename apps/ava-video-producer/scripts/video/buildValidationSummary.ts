import {
  durationInFrames,
  type Storyboard,
} from "../../src/storyboard/schema/schema";
import { assetReferences } from "../lib/planHelpers/planHelpers";

/** The JSON the `validate` command prints for a plan that passed. */
export function buildValidationSummary(plan: Storyboard): string {
  return JSON.stringify(
    {
      valid: true,
      id: plan.id,
      shots: plan.shots.length,
      frames: durationInFrames(plan),
      seconds: durationInFrames(plan) / plan.fps,
      assets: assetReferences(plan).length,
      narration: plan.narrationTrack
        ? "provided track"
        : plan.narration.some((cue) => cue.audio)
          ? "per-cue recordings"
          : "text only",
    },
    null,
    2,
  );
}
