import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import {
  buildThemeIdFromLabel,
  createNewThemeDocument,
  createSavedDocumentFromDraft,
  type ThemeDraft,
} from "../themeDraft/themeDraft";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
} from "../../videoTheme/videoTheme.types";

/**
 * The theme file Copy JSON hands over for the active theme and its draft, or
 * undefined when the theme is not loaded. It is what a save would write. A
 * custom theme copies as saving in place would write it. A built-in theme
 * copies as the new theme Save as new would create: sparse, extending the
 * built-in, without the built-in's own item overrides, under an id no loaded
 * theme uses.
 */
export function buildThemeJsonFromDraft(
  options: Readonly<{
    library: VideoThemeLibrary;
    themeId: string;
    draft: ThemeDraft;
  }>,
): string | undefined {
  const { library, themeId } = options;
  const base = library.get(themeId);
  if (!base) {
    return undefined;
  }
  return JSON.stringify(_createCopiedDocument(options, base), null, 2);
}

function _createCopiedDocument(
  options: Readonly<{ library: VideoThemeLibrary; draft: ThemeDraft }>,
  base: VideoThemeDocument,
): VideoThemeDocument {
  const { library, draft } = options;
  if (!BUILT_IN_VIDEO_THEMES.has(base.id)) {
    return createSavedDocumentFromDraft(base, draft);
  }
  const label = `${base.label} copy`;
  return createNewThemeDocument({
    base,
    draft,
    id: buildThemeIdFromLabel(label, [...library.keys()]),
    label,
  });
}
