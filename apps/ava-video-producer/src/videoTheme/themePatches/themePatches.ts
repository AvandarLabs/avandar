import type { VideoThemePatch } from "../videoTheme.types";

/** A camera preset name, or `authored` for the storyboard's own timing. */
export type CameraPresetName =
  | "authored"
  | "deliberate"
  | "gentle"
  | "balanced"
  | "brisk"
  | "whip";

/** The appearance fields the gallery sends today, before the token editor replaces them. */
export type LegacyAppearance = Readonly<{
  accent?: string;
  background?: string;
  annotationRoughness?: number;
  boxRoughness?: number;
  cameraPreset?: CameraPresetName;
}>;

type StockColors = Readonly<{ accent?: string; background?: string }>;

function _colorParts(colors: StockColors) {
  return {
    swatch: {
      ...(colors.accent ? { accent: colors.accent } : {}),
      ...(colors.background ? { ground: colors.background } : {}),
    },
    semantic: colors.accent
      ? { color: { accent: "$atomic.swatch.accent" } }
      : {},
  };
}

/**
 * A patch that applies a stock request's explicit `accent` and `background`
 * props: each picked hex becomes a swatch (`swatch.accent`, `swatch.ground`)
 * and the accent role points at it. Used by `StockGraphic`, so a colour in
 * content or a CLI request wins over the surrounding theme.
 */
export function createThemePatchFromStockColors(
  colors: StockColors,
): VideoThemePatch {
  const { swatch, semantic } = _colorParts(colors);
  return { other: { video: { atomic: { swatch }, semantic } } };
}

function _sketchProfile(roughnessKey: string) {
  return {
    roughness: `$atomic.roughness.${roughnessKey}`,
    bowing: "$atomic.bowing.md",
    seed: "$atomic.seed.md",
    randomness: "$atomic.randomness.md",
  };
}

/**
 * A patch that carries the gallery's current palette, roughness, and camera
 * preset controls into the theme, so those controls, the live player, and
 * MP4 exports keep working until the token editor replaces them. Roughness
 * values become atomic roughness steps named `legacyAnnotation` and
 * `legacyBox`.
 */
export function createThemePatchFromLegacyAppearance(
  appearance: LegacyAppearance,
): VideoThemePatch {
  const { swatch, semantic } = _colorParts(appearance);
  const hasAnnotation = appearance.annotationRoughness !== undefined;
  const hasBox = appearance.boxRoughness !== undefined;
  return {
    other: {
      video: {
        atomic: {
          swatch,
          roughness: {
            ...(hasAnnotation
              ? { legacyAnnotation: appearance.annotationRoughness }
              : {}),
            ...(hasBox ? { legacyBox: appearance.boxRoughness } : {}),
          },
        },
        semantic: {
          ...semantic,
          sketch: {
            ...(hasAnnotation
              ? { annotation: _sketchProfile("legacyAnnotation") }
              : {}),
            ...(hasBox ? { box: _sketchProfile("legacyBox") } : {}),
          },
          ...(appearance.cameraPreset
            ? { camera: { preset: appearance.cameraPreset } }
            : {}),
        },
      },
    },
  };
}
