const HEX_COLOR = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
/** A six-digit hex colour with no alpha. */
export const OPAQUE_HEX_COLOR = /^#[0-9a-f]{6}$/i;
const MAX_DASH_LENGTHS = 8;

/**
 * The colour a hex field's typed text names, lowercased, or `undefined`
 * while the text is still incomplete. Colour fields keep the text as a
 * draft and emit only what this returns. For example, a palette shade
 * passes `allowAlpha: false` so it accepts only six digits.
 */
export function parseHexDraft(
  text: string,
  options: Readonly<{ allowAlpha: boolean }>,
): string | undefined {
  const pattern = options.allowAlpha ? HEX_COLOR : OPAQUE_HEX_COLOR;
  return pattern.test(text) ? text.toLowerCase() : undefined;
}

/**
 * A number field's typed value when it is a number inside the field's range,
 * otherwise `undefined`. Number fields emit only what this returns, so a
 * half-typed or out-of-range entry, such as a camera curve point above 1,
 * never reaches the theme.
 */
export function parseNumberInRange({
  value,
  min,
  max,
}: Readonly<{
  value: number | string;
  min: number;
  max: number;
}>): number | undefined {
  return typeof value === "number" && value >= min && value <= max
    ? value
    : undefined;
}

/**
 * The dash and gap lengths typed into a dash field, separated by spaces or
 * commas, or `undefined` when the text is not up to eight non-negative
 * numbers. Empty text is a solid line.
 */
export function parseDashDraft(text: string): number[] | undefined {
  const trimmed = text.trim();
  const parts = trimmed ? trimmed.split(/[\s,]+/).map(Number) : [];
  const isValid =
    parts.length <= MAX_DASH_LENGTHS &&
    parts.every((part) => {
      return Number.isFinite(part) && part >= 0;
    });
  return isValid ? parts : undefined;
}

/** A dash pattern as the text a dash field shows, such as `6 6`. */
export function formatDashPattern(pattern: readonly number[]): string {
  return pattern.join(" ");
}

/**
 * The option an enum control shows as selected, or `undefined` when the
 * value is unset or is not one of the options. The control then shows
 * nothing selected rather than passing the first option off as the value.
 */
export function getEnumSelection(
  value: unknown,
  options: readonly string[],
): string | undefined {
  return typeof value === "string" && options.includes(value)
    ? value
    : undefined;
}
