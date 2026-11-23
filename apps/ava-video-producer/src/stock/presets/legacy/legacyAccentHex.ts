import classicTheme from "../../../../themes/classic.theme.json";

/**
 * The hex that original preset content uses to mean "the graphic's accent":
 * `classic`'s mint swatch, the accent those presets were authored against.
 * Renderers read it as a content keyword, never as a colour to draw.
 */
export const LEGACY_ACCENT_HEX: string =
  classicTheme.other.video.atomic.swatch.mint;
