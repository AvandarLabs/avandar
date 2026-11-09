import { objectKeys } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

/**
 * ColorBrewer ramps a graduated color can start from, each safe for common
 * color vision deficiencies. `threshold` flags values below one break in red
 * against a neutral gray.
 */
const GRADUATED_RAMP_PRESETS = {
  blue: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
  orange: ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"],
  red: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
  redBlue: ["#ca0020", "#f4a582", "#f7f7f7", "#92c5de", "#0571b0"],
  threshold: ["#d7301f", "#d9d9d9"],
} as const;

/** The key of one graduated ramp preset. */
export type GraduatedRampPresetKey = keyof typeof GRADUATED_RAMP_PRESETS;

/** A preset ramp, read light to dark or, when reversed, dark to light. */
export type GraduatedRampSource = {
  key: GraduatedRampPresetKey;
  isReversed: boolean;
};

const GRADUATED_RAMP_SOURCES: readonly GraduatedRampSource[] = objectKeys(
  GRADUATED_RAMP_PRESETS,
).flatMap((key) => {
  return [
    { key, isReversed: false },
    { key, isReversed: true },
  ];
});

const GRADUATED_SWATCH_COLORS: readonly string[] = [
  ...new Set(Object.values(GRADUATED_RAMP_PRESETS).flat()),
];

function _createPresetRamp(
  options: Readonly<GraduatedRampSource & { classCount: number }>,
): string[] {
  const colors: readonly string[] = GRADUATED_RAMP_PRESETS[options.key];
  return MapLayer.resampleColorRamp(
    options.isReversed ? colors.toReversed() : colors,
    options.classCount,
  );
}

function _isSameRamp(
  leftRamp: readonly string[],
  rightRamp: readonly string[],
): boolean {
  return (
    leftRamp.length === rightRamp.length &&
    leftRamp.every((color, index) => {
      return color.toLowerCase() === rightRamp[index]?.toLowerCase();
    })
  );
}

function _findPreset(
  ramp: readonly string[],
): GraduatedRampSource | undefined {
  return GRADUATED_RAMP_SOURCES.find((source) => {
    return _isSameRamp(
      _createPresetRamp({ ...source, classCount: ramp.length }),
      ramp,
    );
  });
}

function _resampleRamp(
  ramp: readonly string[],
  classCount: number,
): string[] {
  // A ramp that still matches a preset is resampled from the whole preset,
  // so shrinking to two classes and growing back loses no colors.
  const source = _findPreset(ramp);
  return source
    ? _createPresetRamp({ ...source, classCount })
    : MapLayer.resampleColorRamp(ramp, classCount);
}

function _fitColorToClassCount(color: GraduatedColor): GraduatedColor {
  const classCount = MapLayer.getGraduatedClassCount(color.classification);
  const isRampFitted = color.ramp.length === classCount;
  if (isRampFitted && color.classLabels.length === classCount) {
    return color;
  }
  return {
    ...color,
    ramp: isRampFitted ? color.ramp : _resampleRamp(color.ramp, classCount),
    classLabels: Array.from({ length: classCount }, () => {
      return undefined;
    }),
  };
}

/**
 * Preset color ramps for graduated map colors, and the rule that keeps a
 * layer's ramp and labels at exactly one entry per class. Use it wherever a
 * graduated color is created or its class count changes, such as a ramp
 * select or a layer update that adds a manual break.
 */
export const GraduatedRamps = {
  presets: GRADUATED_RAMP_PRESETS,

  /** Every preset color once, offered as swatches by a class color picker. */
  swatchColors: GRADUATED_SWATCH_COLORS,

  /** A preset resampled to one color per class. */
  createPresetRamp: _createPresetRamp,

  /** The preset and direction a ramp was made from, if it still matches one. */
  findPreset: _findPreset,

  /**
   * Fits a graduated color to its class count. When the count changed, the
   * ramp is resampled and every class label is reset to unset.
   */
  fitColorToClassCount: _fitColorToClassCount,
};
