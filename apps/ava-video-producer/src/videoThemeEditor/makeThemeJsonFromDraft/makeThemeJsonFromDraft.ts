import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { type ThemeDraft, ThemeDrafts } from "../ThemeDrafts/ThemeDrafts";
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
export function makeThemeJsonFromDraft(
  options: Readonly<{
    library: VideoThemeLibrary;
    themeId: string;
    draft: ThemeDraft;
  }>,
): string | undefined {
  const { library, themeId } = options;
  const base = library.get(themeId);
  return !base
    ? undefined
    : JSON.stringify(
        _createCopiedDocument({
          options,
          base,
        }),
        null,
        2,
      );
}
function _createCopiedDocument({
  options,
  base,
}: Readonly<{
  options: Readonly<{
    library: VideoThemeLibrary;
    draft: ThemeDraft;
  }>;
  base: VideoThemeDocument;
}>): VideoThemeDocument {
  const { library, draft } = options;
  if (!BUILT_IN_VIDEO_THEMES.has(base.id)) {
    return ThemeDrafts.toSavedDocument({
      document: base,
      draft,
    });
  }
  const label = `${base.label} copy`;
  return ThemeDrafts.makeNewDocumentFromBase({
    base,
    draft,
    id: ThemeDrafts.makeThemeIdFromLabel({
      label,
      takenIds: [...library.keys()],
    }),
    label,
  });
}
