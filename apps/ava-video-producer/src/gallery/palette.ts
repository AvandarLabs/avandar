import { makeResolvedVideoThemeFromSource } from "../videoTheme/makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import theme from "./theme-colors.json";

/**
 * Atlas defaults are independent of the stock renderer and its existing
 * exports. The accent is the product's primary colour; the background is
 * the ground of the default video theme.
 */
export const DEFAULT_ACCENT = theme.primary[4];
/** The default canvas background for gallery previews. */
export const DEFAULT_BACKGROUND = makeResolvedVideoThemeFromSource(
  DEFAULT_VIDEO_THEME_SOURCE,
).semantic.color.ground;
