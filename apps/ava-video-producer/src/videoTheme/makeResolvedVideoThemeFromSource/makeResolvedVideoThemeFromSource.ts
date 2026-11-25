import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import type { ResolvedVideoTheme, VideoThemeSource } from "../videoTheme.types";

const RESOLVED_THEMES = new WeakMap<VideoThemeSource, ResolvedVideoTheme>();
/**
 * The resolved theme for a source, computed once per source object. Sources
 * are treated as immutable, so providers that share a source (for example
 * the ten motion-blur samples of one stock graphic) share the result.
 */
export function makeResolvedVideoThemeFromSource(
  source: VideoThemeSource,
): ResolvedVideoTheme {
  const cached = RESOLVED_THEMES.get(source);
  if (cached) {
    return cached;
  }
  const theme = makeResolvedVideoThemeFromLibrary({
    library: source.library,
    themeId: source.themeId,
    scope: source.scope,
  });
  RESOLVED_THEMES.set(source, theme);
  return theme;
}
