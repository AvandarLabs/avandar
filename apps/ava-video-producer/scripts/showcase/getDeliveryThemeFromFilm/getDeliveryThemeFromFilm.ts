import { propEq } from "@avandar/utils";
import { DRAFT_THEME_ID } from "../../../src/videoTheme/makeDraftThemeTargetFromLibrary/makeDraftThemeTargetFromLibrary";
import {
  type VideoThemeSnapshot,
  VideoThemeSnapshots,
} from "../../../src/videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import type { Film } from "../../../src/showcase/showcase.types";
// A built-in theme's draft renders as the unsaved theme that extends it, so
// the saved theme it started from is that theme's `extends`.
function _savedThemeId(snapshot: VideoThemeSnapshot | undefined): string {
  return snapshot?.themeId !== DRAFT_THEME_ID
    ? (snapshot?.themeId ?? "classic")
    : (snapshot.documents.find(propEq("id", DRAFT_THEME_ID))?.extends ??
        DRAFT_THEME_ID);
}
/**
 * The theme an export rendered, for its `delivery.json`: the saved theme it
 * started from, the resolved hash (which matches the hash the live player
 * acknowledged for the same draft), and `themeDraft: true` when unsaved
 * edits were applied on top of that theme.
 */
export function getDeliveryThemeFromFilm(
  film: Readonly<Pick<Film, "id" | "theme">>,
): {
  themeId: string;
  themeHash: string;
  themeDraft?: true;
} {
  const hasDraft =
    film.theme !== undefined &&
    (film.theme.themeId === DRAFT_THEME_ID || film.theme.patches.length > 0);
  return {
    themeId: _savedThemeId(film.theme),
    themeHash: VideoThemeSnapshots.toResolvedTheme({
      snapshot: film.theme,
      overrideIds: [film.id],
    }).hash,
    ...(hasDraft ? { themeDraft: true as const } : {}),
  };
}
