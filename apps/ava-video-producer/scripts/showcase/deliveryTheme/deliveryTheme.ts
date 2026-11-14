import { DRAFT_THEME_ID } from "../../../src/videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import {
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { Film } from "../../../src/showcase/showcase.types";

// A built-in theme's draft renders as the unsaved theme that extends it, so
// the saved theme it started from is that theme's `extends`.
function _savedThemeId(snapshot: VideoThemeSnapshot | undefined): string {
  if (snapshot?.themeId !== DRAFT_THEME_ID) {
    return snapshot?.themeId ?? "classic";
  }
  return (
    snapshot.documents.find((document) => document.id === DRAFT_THEME_ID)
      ?.extends ?? DRAFT_THEME_ID
  );
}

/**
 * The theme an export rendered, for its `delivery.json`: the saved theme it
 * started from, the resolved hash (which matches the hash the live player
 * acknowledged for the same draft), and `themeDraft: true` when unsaved
 * edits were applied on top of that theme.
 */
export function getDeliveryThemeFromFilm(
  film: Pick<Film, "id" | "theme">,
): Readonly<{ themeId: string; themeHash: string; themeDraft?: true }> {
  const hasDraft =
    film.theme !== undefined &&
    (film.theme.themeId === DRAFT_THEME_ID || film.theme.patches.length > 0);
  return {
    themeId: _savedThemeId(film.theme),
    themeHash: resolveVideoThemeFromSnapshot(film.theme, [film.id]).hash,
    ...(hasDraft ? { themeDraft: true as const } : {}),
  };
}
