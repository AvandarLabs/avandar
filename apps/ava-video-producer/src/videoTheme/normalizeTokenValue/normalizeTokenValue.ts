import { match, P } from "ts-pattern";
import {
  colorValueSchema,
  makeValueSchemaFromDefinition,
  gradientValueSchema,
} from "../makeValueSchemaFromDefinition";
import { parseCssPixels } from "../parseCssPixels/parseCssPixels";
import {
  VIDEO_FONT_REGISTRY,
  VideoFonts,
} from "../videoFontRegistry/VideoFonts";
import type { FieldSpec } from "../tokenCatalog/TokenDefinitions";

const OTHER_NORMALIZED_KINDS = [
  "color",
  "colorTuple",
  "paletteName",
  "shade",
  "gradient",
  "fontStack",
  "cssLength",
  "cssNumber",
  "length",
  "number",
  "opacity",
  "duration",
  "letterSpacing",
  "fontWeight",
  "easing",
  "spring",
  "shadow",
  "glow",
  "textShadow",
  "dash",
  "enum",
  "boolean",
  "typeStyle",
  "paint",
  "elevation",
  "sketchProfile",
  "box",
  "motionStep",
  "cameraPreset",
  "range",
] as const;

/** A value converted to its kind, or why it could not be. */
export type NormalizedTokenValue =
  | Readonly<{
      ok: true;
      value: unknown;
    }>
  | Readonly<{
      ok: false;
      message: string;
    }>;
const NUMERIC_KINDS = new Set([
  "length",
  "number",
  "opacity",
  "duration",
  "letterSpacing",
  "fontWeight",
]);
function _fail({
  field,
  value,
}: Readonly<{
  field: FieldSpec;
  value: unknown;
}>): NormalizedTokenValue {
  return {
    ok: false,
    message: `Expected a ${field.kind}, found ${JSON.stringify(value)}`,
  };
}
function _normalizeFont({
  field,
  value,
}: Readonly<{
  field: FieldSpec;
  value: unknown;
}>): NormalizedTokenValue {
  if (typeof value === "string" && Object.hasOwn(VIDEO_FONT_REGISTRY, value)) {
    return { ok: true, value };
  }
  const id =
    typeof value === "string"
      ? VideoFonts.getVideoFontIdFromStack(value)
      : undefined;
  return id
    ? { ok: true, value: id }
    : _fail({
        field,
        value,
      });
}
function _normalizeFill({
  field,
  value,
}: Readonly<{
  field: FieldSpec;
  value: unknown;
}>): NormalizedTokenValue {
  if (colorValueSchema.safeParse(value).success) {
    return { ok: true, value: { type: "solid", color: value } };
  }
  const gradient = gradientValueSchema.safeParse(value);
  return gradient.success
    ? { ok: true, value: { type: "gradient", ...gradient.data } }
    : _fail({
        field,
        value,
      });
}
/**
 * Converts a literal that a reference reached into the value its consuming
 * token kind expects. Mantine stores sizes and weights as CSS strings and
 * fonts as stacks; renderers get numbers and registered font ids.
 */
export function normalizeTokenValue({
  field,
  value,
}: Readonly<{
  field: FieldSpec;
  value: unknown;
}>): NormalizedTokenValue {
  if (NUMERIC_KINDS.has(field.kind)) {
    const number = parseCssPixels(value);
    return number === undefined
      ? _fail({
          field,
          value,
        })
      : { ok: true, value: number };
  }
  return match(field.kind)
    .with("fontFamily", () => {
      return _normalizeFont({ field, value });
    })
    .with("fill", () => {
      return _normalizeFill({ field, value });
    })
    .with(P.union(...OTHER_NORMALIZED_KINDS), (): NormalizedTokenValue => {
      const parsed = makeValueSchemaFromDefinition(field)?.safeParse(value);
      return parsed?.success
        ? { ok: true, value: parsed.data }
        : _fail({
            field,
            value,
          });
    })
    .exhaustive();
}
