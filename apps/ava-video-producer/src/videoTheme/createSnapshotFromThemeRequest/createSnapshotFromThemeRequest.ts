import { createDraftThemeTarget } from "../createDraftThemeTarget/createDraftThemeTarget";
import {
  createVideoThemeSnapshot,
  type VideoThemeSnapshot,
} from "../videoThemeSnapshot/videoThemeSnapshot";
import type { VideoThemeLibrary, VideoThemePatch } from "../videoTheme.types";

/**
 * The snapshot a server render takes from a saved theme id and an unsaved
 * patch, under the same draft rule as the gallery preview (see
 * `createDraftThemeTarget`). A present patch marks a draft, even an empty
 * one: the gallery sends `{}` when only another item's override changed.
 * The patch stays in the snapshot either way, so `delivery.json` can record
 * the draft, and an empty patch leaves the resolved hash unchanged. A draft
 * on a built-in theme renders as the unsaved theme saving would create, so
 * an MP4 matches its preview and hash. Used by
 * `loadVideoThemeSnapshot` for exports and showcase films.
 */
export function createSnapshotFromThemeRequest(
  options: Readonly<{
    library: VideoThemeLibrary;
    id: string;
    patch?: VideoThemePatch;
  }>,
): VideoThemeSnapshot {
  const { library, id, patch } = options;
  const patches = patch === undefined ? [] : [patch];
  const target = createDraftThemeTarget({
    library,
    themeId: id,
    hasDraft: patch !== undefined,
  });
  return createVideoThemeSnapshot(target.library, target.themeId, patches);
}
