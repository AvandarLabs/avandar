import {
  getContrastRatioFromColors,
  getWcagLevelFromContrast,
  isLargeTypeStyle,
  type WcagLevel,
} from "../../../videoTheme/textContrast/textContrast";
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

/**
 * A colour role's value with its light-ground side switched on or off.
 * Pairing starts both sides at the current value. Unpairing keeps the
 * dark-ground side. A role already in the asked shape comes back unchanged.
 */
export function setColorPairing(value: unknown, isPaired: boolean): unknown {
  if (isColorPair(value)) {
    return isPaired ? value : value.onDark;
  }
  return isPaired ? { onDark: value, onLight: value } : value;
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
  const ratio = getContrastRatioFromColors(color, ground);
  const level = getWcagLevelFromContrast(
    ratio,
    style ? isLargeTypeStyle(style) : false,
  );
  return { level, ratio: ratio.toFixed(1) };
}

/** A composite token's authored fields, or none when it holds a reference or nothing. */
export function getCompositeFieldsFromValue(
  value: unknown,
): Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}
