import { getValueAtPath } from "../../../src/videoTheme/getValueAtPath";
import { BUILT_IN_VIDEO_THEMES } from "../../../src/videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import type { VideoThemePatch } from "../../../src/videoTheme/videoTheme.types";

const CLASSIC = BUILT_IN_VIDEO_THEMES.get("classic");
/** Picked so no product of a sentinel and a classic constant is classic. */
const SENTINEL_STROKE = 0.7;
const SENTINEL_RADIUS = 7;
const SENTINEL_MULTIPLIER = 1.37;
const SENTINEL_DASH = [1.7, 2.3];
const SENTINEL_OPACITY = 0.4321;
const SENTINEL_FONT_SIZE = "41px";
const SENTINEL_FONT_WEIGHT = 900;
const SENTINEL_TRACKING = 0.315;
function _record(path: readonly string[]): Record<string, unknown> {
  const value = getValueAtPath({
    source: CLASSIC,
    path,
  });
  return typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};
}
function _sentinelColor(index: number): string {
  return `#${(0x3a1f00 + index * 7).toString(16).padStart(6, "0")}`;
}
function _mapKeys({
  path,
  value,
}: Readonly<{
  path: readonly string[];
  value: (key: string, index: number) => unknown;
}>): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(_record(path)).map((key, index) => {
      return [key, value(key, index)];
    }),
  );
}
const ATOMIC = ["other", "video", "atomic"];
/** The patch every sentinel test renders under. */
const SENTINEL_THEME: VideoThemePatch = {
  colors: Object.fromEntries(
    Object.keys(_record(["colors"])).map((name, paletteIndex) => {
      return [
        name,
        Array.from({ length: 10 }, (_, shade) => {
          return _sentinelColor(100 + paletteIndex * 10 + shade);
        }),
      ];
    }),
  ),
  white: _sentinelColor(200),
  black: _sentinelColor(201),
  defaultGradient: {
    from: _sentinelColor(202),
    to: _sentinelColor(203),
    deg: 180,
  },
  radius: _mapKeys({
    path: ["radius"],
    value: () => {
      return `${SENTINEL_RADIUS}px`;
    },
  }),
  fontSizes: _mapKeys({
    path: ["fontSizes"],
    value: () => {
      return SENTINEL_FONT_SIZE;
    },
  }),
  headings: {
    fontWeight: String(SENTINEL_FONT_WEIGHT),
    sizes: _mapKeys({
      path: ["headings", "sizes"],
      value: () => {
        return {
          fontSize: SENTINEL_FONT_SIZE,
          fontWeight: String(SENTINEL_FONT_WEIGHT),
        };
      },
    }),
  },
  other: {
    video: {
      atomic: {
        swatch: _mapKeys({
          path: [...ATOMIC, "swatch"],
          value: (_, index) => {
            return _sentinelColor(index);
          },
        }),
        strokeWidth: _mapKeys({
          path: [...ATOMIC, "strokeWidth"],
          value: () => {
            return SENTINEL_STROKE;
          },
        }),
        dash: _mapKeys({
          path: [...ATOMIC, "dash"],
          value: (key) => {
            return key === "none" ? [] : SENTINEL_DASH;
          },
        }),
        // Full opacity stays full: it means "not faded", not a style value.
        opacity: _mapKeys({
          path: [...ATOMIC, "opacity"],
          value: (key) => {
            return key === "100" ? 1 : SENTINEL_OPACITY;
          },
        }),
        glow: _mapKeys({
          path: [...ATOMIC, "glow"],
          value: (key) => {
            return {
              ..._record([...ATOMIC, "glow", key]),
              opacity: SENTINEL_OPACITY,
            };
          },
        }),
        fontWeight: _mapKeys({
          path: [...ATOMIC, "fontWeight"],
          value: () => {
            return SENTINEL_FONT_WEIGHT;
          },
        }),
        // No tracking stays none: it means "not tracked", not a style value.
        letterSpacing: _mapKeys({
          path: [...ATOMIC, "letterSpacing"],
          value: (key) => {
            return key === "none" ? 0 : SENTINEL_TRACKING;
          },
        }),
        multiplier: { identity: SENTINEL_MULTIPLIER },
      },
    },
  },
};
/**
 * Builds sentinel theme values and exposes classic token records for renderer
 * coverage assertions.
 */
export const SentinelThemeData = {
  /** The built-in classic document used as the coverage reference. */
  CLASSIC: CLASSIC,
  /** The classic record at a document path, or an empty record. */
  record: _record,
  /** The document path containing classic atomic scales. */
  ATOMIC: ATOMIC,
  /**
   * The sentinel theme the "follow a sentinel theme" tests render every Atlas
   * item under. It moves every swatch, palette shade, white, black, radius,
   * stroke width, dash step, opacity step, glow opacity, type scale step, font
   * weight, tracking step, and the identity multiplier to an improbable value.
   * A renderer that reads the theme then draws no `classic` value, so any
   * `classic` value left in its markup is a literal, even one routed through a
   * constant the pattern scan cannot see.
   */
  SENTINEL_THEME: SENTINEL_THEME,
} as const;
