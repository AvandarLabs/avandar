import type {
  VideoThemeDocument,
  VideoThemeLibrary,
} from "../../videoTheme/videoTheme.types";
/** Gets the named theme or fails before a draft operation uses its document. */
export function getThemeDocumentFromLibrary({
  library,
  themeId,
}: Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
}>): VideoThemeDocument {
  const document = library.get(themeId);
  if (!document) {
    throw new Error(`Unknown theme "${themeId}"`);
  }
  return document;
}
