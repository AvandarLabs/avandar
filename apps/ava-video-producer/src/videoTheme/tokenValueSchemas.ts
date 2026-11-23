import { z } from "zod";
import {
  VIDEO_FONT_IDS,
  VIDEO_FONT_STACKS,
} from "./videoFontRegistry/videoFontRegistryHelpers";
import type { FieldSpec } from "./tokenCatalog/defineTokensHelpers";
import type { TokenDefinition } from "./videoTheme.types";

const unitInterval = z.number().min(0).max(1);
const shadeIndex = z.number().int().min(0).max(9);
const bezierY = z.number().min(-1).max(2);

/** A hex colour, with optional alpha: `#rgb`, `#rrggbb`, or `#rrggbbaa`. */
export const colorValueSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
    "Expected a hex colour such as #51a7ff",
  );
export const gradientValueSchema = z.strictObject({
  from: colorValueSchema,
  to: colorValueSchema,
  deg: z.number().min(0).max(360),
});
export const easingValueSchema = z.union([
  z.tuple([unitInterval, bezierY, unitInterval, bezierY]),
  z.strictObject({ powerInOut: z.number().min(1).max(8) }),
]);
export const springValueSchema = z.strictObject({
  damping: z.number().min(1).max(100),
  stiffness: z.number().min(1).max(1000),
  mass: z.number().min(0.1).max(10),
});
const shadowLayerSchema = z.strictObject({
  offsetX: z.number().min(-200).max(200),
  offsetY: z.number().min(-200).max(200),
  blur: z.number().min(0).max(200),
  spread: z.number().min(-100).max(100),
  alpha: unitInterval,
});
export const shadowValueSchema = z.strictObject({
  layers: z.array(shadowLayerSchema).max(4),
});
export const glowValueSchema = z.strictObject({
  spread: z.number().min(-200).max(200),
  blur: z.number().min(0).max(100),
  opacity: unitInterval,
});
const colorTupleSchema = z.array(colorValueSchema).length(10);
const shadeValueSchema = z.union([
  shadeIndex,
  z.strictObject({ light: shadeIndex, dark: shadeIndex }),
]);
const cssLengthSchema = z
  .string()
  .regex(/^-?\d+(?:\.\d+)?px$/, "Expected pixels such as 18px");
const cssNumberSchema = z
  .string()
  .regex(/^-?\d+(?:\.\d+)?$/, "Expected a number such as 1.3");
const dashSchema = z.array(z.number().min(0).max(1000)).max(8);
export const textShadowValueSchema = z.strictObject({
  offsetX: z.number().min(-50).max(50),
  offsetY: z.number().min(-50).max(50),
  blur: z.number().min(0).max(50),
  alpha: unitInterval,
});

function _boundedNumber(definition: Pick<TokenDefinition, "min" | "max">) {
  let schema = z.number();
  if (definition.min !== undefined) {
    schema = schema.min(definition.min);
  }
  if (definition.max !== undefined) {
    schema = schema.max(definition.max);
  }
  return schema;
}

function _createFixedSchemaFromKind(
  kind: FieldSpec["kind"],
): z.ZodType | undefined {
  switch (kind) {
    case "color":
      return colorValueSchema;
    case "colorTuple":
      return colorTupleSchema;
    case "shade":
      return shadeValueSchema;
    case "gradient":
      return gradientValueSchema;
    case "fontStack":
      return z.enum(VIDEO_FONT_STACKS);
    case "cssLength":
      return cssLengthSchema;
    case "cssNumber":
      return cssNumberSchema;
    case "easing":
      return easingValueSchema;
    case "spring":
      return springValueSchema;
    case "shadow":
      return shadowValueSchema;
    case "glow":
      return glowValueSchema;
    case "textShadow":
      return textShadowValueSchema;
    case "dash":
      return dashSchema;
    case "fontFamily":
      return z.enum(VIDEO_FONT_IDS);
    case "boolean":
      return z.boolean();
    default:
      return undefined;
  }
}

/**
 * The zod schema for a token kind's literal value, or undefined for kinds
 * that have no literal form of their own (composites and fills). Used by
 * the theme schema for atomic and Mantine values and component one-offs, and
 * by the resolver to validate a value a reference reached.
 */
export function createValueSchemaFromDefinition(
  definition: FieldSpec & Pick<TokenDefinition, "min" | "max">,
): z.ZodType | undefined {
  switch (definition.kind) {
    case "paletteName":
    case "enum":
      return z.enum(definition.options ?? []);
    case "length":
    case "number":
    case "opacity":
    case "letterSpacing":
      return _boundedNumber(definition);
    case "duration":
    case "fontWeight":
      return _boundedNumber(definition).int();
    default:
      return _createFixedSchemaFromKind(definition.kind);
  }
}
