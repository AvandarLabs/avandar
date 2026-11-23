const PIXELS_PATTERN = /^(-?\d*\.?\d+)px$/;
const REM_PATTERN = /^(-?\d*\.?\d+)rem$/;
const MANTINE_REM_PATTERN =
  /^calc\((-?\d*\.?\d+)rem \* var\(--mantine-scale\)\)$/;
const NUMBER_PATTERN = /^-?\d*\.?\d+$/;

/**
 * Pixels from a number or a Mantine CSS length: `18px`, `1.5rem`,
 * `calc(0.75rem * var(--mantine-scale))`, or a bare numeric string. Rem
 * values use the 16 px root at scale 1. Undefined when the value is none of
 * these.
 */
export function parseCssPixels(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const text = value.trim();
  const pixels = PIXELS_PATTERN.exec(text);
  if (pixels) {
    return Number(pixels[1]);
  }
  const rem = REM_PATTERN.exec(text) ?? MANTINE_REM_PATTERN.exec(text);
  return rem
    ? Number(rem[1]) * 16
    : NUMBER_PATTERN.test(text)
      ? Number(text)
      : undefined;
}
