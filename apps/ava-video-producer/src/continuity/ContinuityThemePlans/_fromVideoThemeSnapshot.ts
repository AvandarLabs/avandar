import { VideoThemeSnapshots } from "../../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import { ContinuityThemePlans } from "./ContinuityThemePlans";
import type { Storyboard } from "../../storyboard/schema/schema";
import type { VideoThemeSnapshot } from "../../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
/**
 * `createContinuityPlanFromVideoTheme` with a snapshot's theme, resolved for
 * `overrideIds` (the film or plan id). Use it wherever a themed film's frames
 * are counted, so the count matches the picture.
 */
export function _fromVideoThemeSnapshot({
  plan,
  snapshot,
  overrideIds,
}: Readonly<{
  plan: Storyboard;
  snapshot: VideoThemeSnapshot | undefined;
  overrideIds: readonly string[];
}>): Storyboard {
  return ContinuityThemePlans.fromVideoTheme({
    plan,
    theme: VideoThemeSnapshots.toResolvedTheme({
      snapshot,
      overrideIds,
    }),
  });
}
