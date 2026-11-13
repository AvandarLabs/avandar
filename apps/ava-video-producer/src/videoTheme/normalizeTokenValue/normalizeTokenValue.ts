import {
  colorValueSchema,
  createValueSchemaFromDefinition,
  gradientValueSchema,
} from "../tokenValueSchemas/tokenValueSchemas";
import {
  getVideoFontIdFromStack,
  VIDEO_FONT_REGISTRY,
} from "../videoFontRegistry/videoFontRegistry";
import type { FieldSpec } from "../tokenCatalog/defineTokens";

/** A value converted to its kind, or why it could not be. */
export type NormalizedTokenValue =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false; message: string }>;

const NUMERIC_KINDS = new Set([
  "length",
  "number",
  "opacity",
  "duration",
  "letterSpacing",
  "fontWeight",
]);
const PIXELS_PATTERN = /^(-?\d*\.?\d+)px$/;
const REM_PATTERN = /^(-?\d*\.?\d+)rem$/;
const MANTINE_REM_PATTERN = /^calc\((-?\d*\.?\d+)rem \* var\(--mantine-scale\)\)$/;
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
  if (rem) {
    return Number(rem[1]) * 16;
  }
  return NUMBER_PATTERN.test(text) ? Number(text) : undefined;
}

function _fail(field: FieldSpec, value: unknown): NormalizedTokenValue {
  return {
    ok: false,
    message: `Expected a ${field.kind}, found ${JSON.stringify(value)}`,
  };
}

function _normalizeFont(field: FieldSpec, value: unknown): NormalizedTokenValue {
  if (typeof value === "string" && Object.hasOwn(VIDEO_FONT_REGISTRY, value)) {
    return { ok: true, value };
  }
  const id = typeof value === "string" ? getVideoFontIdFromStack(value) : undefined;
  return id ? { ok: true, value: id } : _fail(field, value);
}

function _normalizeFill(field: FieldSpec, value: unknown): NormalizedTokenValue {
  if (colorValueSchema.safeParse(value).success) {
    return { ok: true, value: { type: "solid", color: value } };
  }
  const gradient = gradientValueSchema.safeParse(value);
  return gradient.success
    ? { ok: true, value: { type: "gradient", ...gradient.data } }
    : _fail(field, value);
}

/**
 * Converts a literal that a reference reached into the value its consuming
 * token kind expects. Mantine stores sizes and weights as CSS strings and
 * fonts as stacks; renderers get numbers and registered font ids.
 */
export function normalizeTokenValue(
  field: FieldSpec,
  value: unknown,
): NormalizedTokenValue {
  if (NUMERIC_KINDS.has(field.kind)) {
    const number = parseCssPixels(value);
    return number === undefined ? _fail(field, value) : { ok: true, value: number };
  }
  if (field.kind === "fontFamily") {
    return _normalizeFont(field, value);
  }
  if (field.kind === "fill") {
    return _normalizeFill(field, value);
  }
  const parsed = createValueSchemaFromDefinition(field)?.safeParse(value);
  return parsed?.success ? { ok: true, value: parsed.data } : _fail(field, value);
}
