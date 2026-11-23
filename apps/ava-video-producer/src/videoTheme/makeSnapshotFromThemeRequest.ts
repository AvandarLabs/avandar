import { makeDraftThemeTargetFromLibrary } from "./makeDraftThemeTargetFromLibrary/makeDraftThemeTargetFromLibrary";
import {
  type VideoThemeSnapshot,
  VideoThemeSnapshots,
} from "./VideoThemeSnapshots/VideoThemeSnapshots";
import type { VideoThemeLibrary, VideoThemePatch } from "./videoTheme.types";
/**
 * The snapshot a server render takes from a saved theme id and an unsaved
 * patch, under the same draft rule as the gallery preview (see
 * `makeDraftThemeTargetFromLibrary`). A draft on a built-in theme renders as
 * the
 * unsaved theme saving would create, so an MP4 matches its preview.
 */
export function makeSnapshotFromThemeRequest(
  options: Readonly<{
    library: VideoThemeLibrary;
    id: string;
    patch?: VideoThemePatch;
  }>,
): VideoThemeSnapshot {
  const { library, id, patch } = options;
  // A present patch marks a draft, even an empty one: the gallery sends `{}`
  // when only another item's override changed. The patch stays in the
  // snapshot so `delivery.json` can record the draft, and an empty patch
  // leaves the resolved hash unchanged.
  const patches = patch === undefined ? [] : [patch];
  const target = makeDraftThemeTargetFromLibrary({
    library,
    themeId: id,
    hasDraft: patch !== undefined,
  });
  return VideoThemeSnapshots.fromLibrary({
    library: target.library,
    themeId: target.themeId,
    patches,
  });
}
