import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import type { VideoThemeSource } from "../../videoTheme/videoTheme.types";

/** The id of the built-in theme the fixed compositions default to. */
export const STARTER_VIDEO_THEME_ID = "starter";

const SOURCES = new Map<string, VideoThemeSource>();

/**
 * The `starter` theme for one fixed composition, scoped by its id so a
 * theme's override for it applies. `starter` extends `classic` and pins the
 * scene palette to the starter swatches, which reproduce `src/theme.css`,
 * so `Demo`, `MotionLab`, and `TitleStudy` keep the upstream demo look.
 * Returns the same object for the same id.
 */
export function createStarterVideoThemeSource(
  itemId: string,
): VideoThemeSource {
  const cached = SOURCES.get(itemId);
  if (cached) {
    return cached;
  }
  const source: VideoThemeSource = {
    library: BUILT_IN_VIDEO_THEMES,
    themeId: STARTER_VIDEO_THEME_ID,
    scope: { overrideIds: [itemId], patches: [] },
  };
  SOURCES.set(itemId, source);
  return source;
}
