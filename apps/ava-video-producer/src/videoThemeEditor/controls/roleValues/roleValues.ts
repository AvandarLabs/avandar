import {
  getContrastRatioFromColors,
  getWcagLevelFromContrast,
  isLargeTypeStyle,
  type WcagLevel,
} from "../../../videoTheme/textContrastHelpers/textContrastHelpers";
import type { ResolvedTypeStyle } from "../../../videoTheme/videoTheme.types";

/** A colour role that differs on dark and light grounds. */
export type ColorPair = Readonly<{ onDark: unknown; onLight: unknown }>;

/** A text colour's WCAG level and its ratio as text, such as `4.6`. */
export type ContrastSummary = Readonly<{ level: WcagLevel; ratio: string }>;

/** Whether a colour role's authored value has a dark-ground and a light-ground side. */
export function isColorPair(value: unknown): value is ColorPair {
  return (
    typeof value === "object" &&
    value !== null &&
    "onDark" in value &&
    "onLight" in value
  );
}

/** Whether a colour role has a value to pair. An unset role has none. */
export function canPairColorRole(value: unknown): boolean {
  return value !== undefined && value !== null;
}

/**
 * A colour role's value with its light-ground side switched on or off.
 * Pairing starts both sides at the current value. Unpairing keeps the
 * dark-ground side, or the light-ground side when the dark one is unset. A
 * role already in the asked shape comes back unchanged, and so does an unset
 * role, so a pair never has an undefined side.
 */
export function setColorPairing(value: unknown, isPaired: boolean): unknown {
  if (isColorPair(value)) {
    return isPaired ? value : (value.onDark ?? value.onLight);
  }
  return isPaired && canPairColorRole(value)
    ? { onDark: value, onLight: value }
    : value;
}

/**
 * A contrast ratio's WCAG level and its ratio floored to one decimal, so the
 * number shown never reaches a threshold the level did not. For example,
 * 4.497 shows `4.4` and fails, rather than `4.5`.
 */
export function getContrastSummaryFromRatio(
  ratio: number,
  isLargeText: boolean,
): ContrastSummary {
  return {
    level: getWcagLevelFromContrast(ratio, isLargeText),
    ratio: (Math.floor(ratio * 10) / 10).toFixed(1),
  };
}

/**
 * The contrast of a text colour against a ground, for a contrast badge.
 * Pass the type style when one is known, so large text gets the lower bar.
 */
export function getContrastSummaryFromColors(
  color: string,
  ground: string,
  style?: Pick<ResolvedTypeStyle, "fontSize" | "fontWeight">,
): ContrastSummary {
  return getContrastSummaryFromRatio(
    getContrastRatioFromColors(color, ground),
    style ? isLargeTypeStyle(style) : false,
  );
}

/** A composite token's authored fields, or none when it holds a reference or nothing. */
export function getCompositeFieldsFromValue(
  value: unknown,
): Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}
