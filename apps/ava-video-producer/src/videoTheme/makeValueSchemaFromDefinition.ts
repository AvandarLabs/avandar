import { match, P } from "ts-pattern";
import { z } from "zod";
import {
  VIDEO_FONT_IDS,
  VIDEO_FONT_STACKS,
} from "./videoFontRegistry/VideoFonts";
import type { FieldSpec } from "./tokenCatalog/TokenDefinitions";
import type { TokenDefinition } from "./videoTheme.types";

const UNHANDLED_CREATE_FIXED_SCHEMA_FROM_KIND_KINDS = [
  "paletteName",
  "length",
  "number",
  "opacity",
  "duration",
  "letterSpacing",
  "fontWeight",
  "enum",
  "fill",
  "typeStyle",
  "paint",
  "elevation",
  "sketchProfile",
  "box",
  "motionStep",
  "cameraPreset",
  "range",
] as const;
const UNHANDLED_CREATE_VALUE_SCHEMA_FROM_DEFINITION_KINDS = [
  "color",
  "colorTuple",
  "shade",
  "gradient",
  "fontStack",
  "cssLength",
  "cssNumber",
  "easing",
  "spring",
  "shadow",
  "glow",
  "textShadow",
  "dash",
  "fontFamily",
  "boolean",
  "fill",
  "typeStyle",
  "paint",
  "elevation",
  "sketchProfile",
  "box",
  "motionStep",
  "cameraPreset",
  "range",
] as const;

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
/** Validates theme gradients with two colors and an angle. */
export const gradientValueSchema = z.strictObject({
  from: colorValueSchema,
  to: colorValueSchema,
  deg: z.number().min(0).max(360),
});
/** Validates cubic Bezier or power easing values in theme documents. */
export const easingValueSchema = z.union([
  z.tuple([unitInterval, bezierY, unitInterval, bezierY]),
  z.strictObject({ powerInOut: z.number().min(1).max(8) }),
]);
/** Validates damping, stiffness, and mass for theme spring motion. */
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
/** Validates the bounded layer list of a theme shadow. */
export const shadowValueSchema = z.strictObject({
  layers: z.array(shadowLayerSchema).max(4),
});
/** Validates the spread, blur, and opacity of a theme glow. */
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
/** Validates the offsets, blur, and alpha of a theme text shadow. */
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

/** Predefined schema instances shared by fixed literal token kinds. */
const FIXED_VALUE_SCHEMAS = {
  color: colorValueSchema,
  colorTuple: colorTupleSchema,
  shade: shadeValueSchema,
  gradient: gradientValueSchema,
  cssLength: cssLengthSchema,
  cssNumber: cssNumberSchema,
  easing: easingValueSchema,
  spring: springValueSchema,
  shadow: shadowValueSchema,
  glow: glowValueSchema,
  textShadow: textShadowValueSchema,
  dash: dashSchema,
};

function _createFixedSchemaFromKind(
  kind: FieldSpec["kind"],
): z.ZodType | undefined {
  return match(kind)
    .with(
      P.union(
        "color",
        "colorTuple",
        "shade",
        "gradient",
        "cssLength",
        "cssNumber",
        "easing",
        "spring",
        "shadow",
        "glow",
        "textShadow",
        "dash",
      ),
      (fixedKind) => {
        return FIXED_VALUE_SCHEMAS[fixedKind];
      },
    )
    .with("fontStack", () => {
      return z.enum(VIDEO_FONT_STACKS);
    })
    .with("fontFamily", () => {
      return z.enum(VIDEO_FONT_IDS);
    })
    .with("boolean", () => {
      return z.boolean();
    })
    .with(P.union(...UNHANDLED_CREATE_FIXED_SCHEMA_FROM_KIND_KINDS), () => {
      return undefined;
    })
    .exhaustive();
}

/**
 * The zod schema for a token kind's literal value, or undefined for kinds
 * that have no literal form of their own (composites and fills). Used by
 * the theme schema for atomic and Mantine values and component one-offs, and
 * by the resolver to validate a value a reference reached.
 */
export function makeValueSchemaFromDefinition(
  definition: FieldSpec & Pick<TokenDefinition, "min" | "max">,
): z.ZodType | undefined {
  return match(definition.kind)
    .with("paletteName", "enum", () => {
      return z.enum(definition.options ?? []);
    })
    .with("length", "number", "opacity", "letterSpacing", () => {
      return _boundedNumber(definition);
    })
    .with("duration", "fontWeight", () => {
      return _boundedNumber(definition).int();
    })
    .with(
      P.union(...UNHANDLED_CREATE_VALUE_SCHEMA_FROM_DEFINITION_KINDS),
      () => {
        return _createFixedSchemaFromKind(definition.kind);
      },
    )
    .exhaustive();
}
