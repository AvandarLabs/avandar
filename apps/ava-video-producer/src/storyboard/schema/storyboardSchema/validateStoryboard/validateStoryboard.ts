import { prop } from "@avandar/utils";
import { checkUniqueStoryboardIds } from "./checkUniqueStoryboardIds";
import { validateStoryboardDimensions } from "./validateStoryboardDimensions";
import { validateStoryboardNarration } from "./validateStoryboardNarration";
import { validateStoryboardShot } from "./validateStoryboardShot";
import type { StoryboardPlan } from "./storyboardValidation.types";
import type { z } from "zod";
/** Reports cross-field storyboard issues in their original validation order. */
export function validateStoryboard(
  plan: StoryboardPlan,
  context: z.RefinementCtx,
): void {
  const issue = (message: string): void => {
    return context.addIssue({ code: "custom", message });
  };
  checkUniqueStoryboardIds({
    ids: plan.shots.map(prop("id")),
    name: "Shot",
    issue: issue,
  });
  checkUniqueStoryboardIds({
    ids: plan.narration.map(prop("id")),
    name: "Narration cue",
    issue: issue,
  });
  checkUniqueStoryboardIds({
    ids: plan.soundEffects.map(prop("id")),
    name: "Sound effect",
    issue: issue,
  });
  validateStoryboardDimensions({ plan: plan, issue: issue });
  let offset = 0;
  const starts = new Map<string, number>();
  plan.shots.forEach((shot) => {
    starts.set(shot.id, offset);
    offset += shot.durationInFrames;
    validateStoryboardShot({ plan: plan, shot: shot, issue: issue });
  });
  validateStoryboardNarration({ plan: plan, starts: starts, issue: issue });
  if (plan.narrationTrack && plan.narrationTrack.startFrame >= offset) {
    issue("Narration track starts after the film ends");
  }
  if (
    plan.soundEffects.some((sound) => {
      return sound.atFrame >= offset;
    })
  ) {
    issue("Sound effect starts after the film ends");
  }
}
