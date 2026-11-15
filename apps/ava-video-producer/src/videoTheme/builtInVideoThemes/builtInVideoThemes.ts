import avandarTheme from "../../../themes/avandar.theme.json";
import classicTheme from "../../../themes/classic.theme.json";
import { parseVideoThemeDocument } from "../videoThemeSchemaHelpers/videoThemeSchemaHelpers";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
  VideoThemeSource,
} from "../videoTheme.types";

/** Ids of the themes bundled with the producer. They are read-only. */
export const BUILT_IN_VIDEO_THEME_IDS = ["classic", "avandar"] as const;

/**
 * Bundled built-in themes by id, validated at load. Every render can resolve
 * these without a server, for example a Remotion Studio preview or a stock
 * card rendered outside any theme provider.
 */
export const BUILT_IN_VIDEO_THEMES: VideoThemeLibrary = new Map(
  [classicTheme, avandarTheme].map((value) => {
    const document = parseVideoThemeDocument(value);
    return [document.id, document] as const;
  }),
);

/** `classic` from the built-in library: the theme of anything left unthemed. */
export const DEFAULT_VIDEO_THEME_SOURCE: VideoThemeSource = {
  library: BUILT_IN_VIDEO_THEMES,
  themeId: "classic",
};

/**
 * A library of the built-in themes plus custom ones, such as themes read
 * from `themes/` or an unsaved copy in the editor. A custom theme cannot
 * replace a built-in id.
 */
export function createVideoThemeLibrary(
  documents: readonly VideoThemeDocument[],
): VideoThemeLibrary {
  return new Map([
    ...BUILT_IN_VIDEO_THEMES,
    ...documents
      .filter((document) => !BUILT_IN_VIDEO_THEMES.has(document.id))
      .map((document) => [document.id, document] as const),
  ]);
}
