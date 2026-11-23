import { BUILT_IN_VIDEO_THEME_IDS } from "../builtInVideoThemes/builtInVideoThemes";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
} from "../videoTheme.types";

/**
 * The reserved id of the unsaved theme a built-in theme's draft resolves as.
 * No theme file may use it: the theme store and Save as new theme refuse it.
 */
export const DRAFT_THEME_ID = "unsaved-draft";

/** The library and theme a draft resolves against. */
export type DraftThemeTarget = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
}>;

/**
 * The theme a draft resolves as, so previews, the live player, and exports
 * all show exactly the document saving would produce. A custom theme saves
 * in place, so it is its own target. A built-in theme is read-only: saving
 * its draft creates a new theme that extends it, and per-item overrides are
 * not inherited through `extends`, so a built-in with a draft resolves as an
 * unsaved theme with no overrides of its own. A built-in with no draft is
 * itself, overrides included.
 */
export function createDraftThemeTarget(
  options: Readonly<{
    library: VideoThemeLibrary;
    themeId: string;
    hasDraft: boolean;
  }>,
): DraftThemeTarget {
  const { library, themeId, hasDraft } = options;
  if (
    !hasDraft ||
    !(BUILT_IN_VIDEO_THEME_IDS as readonly string[]).includes(themeId)
  ) {
    return { library, themeId };
  }
  const draftDocument: VideoThemeDocument = {
    schemaVersion: 1,
    id: DRAFT_THEME_ID,
    label: library.get(themeId)?.label ?? themeId,
    extends: themeId,
  };
  return {
    library: new Map<string, VideoThemeDocument>([
      ...library,
      [DRAFT_THEME_ID, draftDocument],
    ]),
    themeId: DRAFT_THEME_ID,
  };
}
