import type {
  CatalogNode,
  TokenDefinition,
  TokenKind,
  TokenScale,
} from "../videoTheme.types";

/**
 * Declares one token's metadata and keeps its literal kind and options in
 * the type, so resolved values are typed. Use it for every catalog leaf.
 */
export function token<const Definition extends TokenDefinition>(
  definition: Definition,
): Definition {
  return definition;
}

/**
 * Declares an open set of same-kind atomic values, such as swatches or a
 * duration scale. A theme may add keys to a scale.
 */
export function scale<const Definition extends TokenDefinition>(
  definition: Definition,
): Readonly<{ scale: Definition }> {
  return { scale: definition };
}

/** Whether a catalog node is one token. */
export function isTokenDefinition(node: CatalogNode): node is TokenDefinition {
  return "kind" in node && typeof node.kind === "string";
}

/** Whether a catalog node is a scale of same-kind tokens. */
export function isTokenScale(node: CatalogNode): node is TokenScale {
  return (
    "scale" in node &&
    typeof node.scale === "object" &&
    node.scale !== null &&
    "kind" in node.scale
  );
}

/** One field of a composite token. */
export type FieldSpec = Readonly<{
  kind: TokenKind;
  options?: readonly string[];
}>;

export const TEXT_TRANSFORMS = [
  "none",
  "uppercase",
  "lowercase",
  "capitalize",
] as const;
export const NUMERIC_VARIANTS = ["normal", "tabular-nums"] as const;

/**
 * Fields of composite token kinds. In the semantic tier each field is a
 * reference (enum fields stay literal); in the component tier a field may
 * also be a literal. The resolver, schema, and editor all read this.
 */
export const COMPOSITE_TOKEN_FIELDS = {
  typeStyle: {
    required: ["family", "size", "weight", "color"],
    fields: {
      family: { kind: "fontFamily" },
      size: { kind: "length" },
      weight: { kind: "fontWeight" },
      lineHeight: { kind: "number" },
      letterSpacing: { kind: "letterSpacing" },
      transform: { kind: "enum", options: TEXT_TRANSFORMS },
      numeric: { kind: "enum", options: NUMERIC_VARIANTS },
      color: { kind: "color" },
      alpha: { kind: "opacity" },
      textShadow: { kind: "textShadow" },
      glow: { kind: "glow" },
      stroke: { kind: "length" },
    },
  },
  paint: {
    required: ["color", "alpha"],
    fields: { color: { kind: "color" }, alpha: { kind: "opacity" } },
  },
  elevation: {
    required: ["shadow", "color"],
    fields: { shadow: { kind: "shadow" }, color: { kind: "color" } },
  },
  sketchProfile: {
    required: ["roughness", "bowing", "seed", "randomness"],
    fields: {
      roughness: { kind: "number" },
      bowing: { kind: "number" },
      seed: { kind: "number" },
      randomness: { kind: "length" },
    },
  },
  box: {
    required: [],
    fields: {
      top: { kind: "length" },
      right: { kind: "length" },
      bottom: { kind: "length" },
      left: { kind: "length" },
      x: { kind: "length" },
      y: { kind: "length" },
      gap: { kind: "length" },
    },
  },
  motionStep: {
    required: [],
    fields: {
      duration: { kind: "duration" },
      easing: { kind: "easing" },
      distance: { kind: "length" },
      spring: { kind: "spring" },
      period: { kind: "duration" },
      rate: { kind: "number" },
    },
  },
  cameraPreset: {
    required: ["speed", "shutter", "easing"],
    fields: {
      speed: { kind: "number" },
      shutter: { kind: "number" },
      easing: { kind: "easing" },
    },
  },
  range: {
    required: ["min", "max"],
    fields: { min: { kind: "number" }, max: { kind: "number" } },
  },
} as const satisfies Record<
  string,
  Readonly<{
    required: readonly string[];
    fields: Readonly<Record<string, FieldSpec>>;
  }>
>;

export type CompositeTokenKind = keyof typeof COMPOSITE_TOKEN_FIELDS;

/** Whether a token kind bundles several referenced fields. */
export function isCompositeTokenKind(
  kind: TokenKind,
): kind is CompositeTokenKind {
  return Object.hasOwn(COMPOSITE_TOKEN_FIELDS, kind);
}

/**
 * The editor control for each token kind (spec §3.3). Exported in the JSON
 * Schema as `control`, so a theme generator knows how a value is edited.
 */
export const TOKEN_CONTROLS = {
  color: "color",
  colorTuple: "palette",
  paletteName: "segmented",
  shade: "shade",
  gradient: "gradient",
  fontStack: "font",
  cssLength: "slider",
  cssNumber: "slider",
  length: "slider",
  number: "slider",
  opacity: "slider",
  duration: "duration",
  letterSpacing: "slider",
  fontWeight: "slider",
  easing: "easing",
  spring: "spring",
  shadow: "layers",
  glow: "layers",
  textShadow: "layers",
  dash: "dash",
  fontFamily: "font",
  enum: "segmented",
  boolean: "switch",
  fill: "fill",
  typeStyle: "typeStyle",
  paint: "paint",
  elevation: "elevation",
  sketchProfile: "sketch",
  box: "box",
  motionStep: "motionStep",
  cameraPreset: "cameraPreset",
  range: "range",
} as const satisfies Record<TokenKind, string>;
export type TokenControlKind = (typeof TOKEN_CONTROLS)[TokenKind];
