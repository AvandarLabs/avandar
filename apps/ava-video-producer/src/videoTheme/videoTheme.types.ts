import type { ATOMIC_TOKENS } from "./tokenCatalog/atomicTokens";
import type { COMPONENT_TOKENS } from "./tokenCatalog/componentTokens/componentTokens";
import type { SEMANTIC_TOKENS } from "./tokenCatalog/semanticTokens/semanticTokens";
import type { TEXT_TRANSFORMS } from "./tokenCatalog/TokenDefinitions";
import type { VideoFontId } from "./videoFontRegistry/VideoFonts";
/*
 * Types shared by the video theme model: authored values, token metadata,
 * theme documents, and the resolved values renderers read.
 */
import type { MantineTheme } from "@mantine/core";

/**
 * A `$path` reference from one token to another, such as
 * `$atomic.strokeWidth.sm`.
 */
export type TokenReference = `$${string}`;

/** Where a theme problem is, by token path, and what it is. */
export type VideoThemeIssue = Readonly<{ path: string; message: string }>;

/**
 * Cubic Bezier control points `[x1, y1, x2, y2]`, or a symmetric power curve.
 */
export type EasingValue =
  | readonly [number, number, number, number]
  | Readonly<{ powerInOut: number }>;
/** Damping, stiffness, and mass parameters of theme spring motion. */
export type SpringValue = Readonly<{
  damping: number;
  stiffness: number;
  mass: number;
}>;
/** Offsets, spread, blur, and alpha for one theme shadow layer. */
export type ShadowLayer = Readonly<{
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  alpha: number;
}>;
/** The ordered shadow layers of a theme token. */
export type ShadowValue = Readonly<{ layers: readonly ShadowLayer[] }>;
/** Spread, blur, and opacity parameters of a theme glow. */
export type GlowValue = Readonly<{
  spread: number;
  blur: number;
  opacity: number;
}>;
/** Offsets, blur, and alpha parameters of a theme text shadow. */
export type TextShadowValue = Readonly<{
  offsetX: number;
  offsetY: number;
  blur: number;
  alpha: number;
}>;
/** Two colors and an angle defining a theme gradient. */
export type GradientValue = Readonly<{ from: string; to: string; deg: number }>;
/** A shared shade or distinct shades for light and dark modes. */
export type ShadeValue = number | Readonly<{ light: number; dark: number }>;

/** A resolved solid or gradient fill for rendering. */
export type ResolvedFill =
  | Readonly<{ type: "solid"; color: string }>
  | Readonly<{ type: "gradient"; from: string; to: string; deg: number }>;
/** A theme text shadow with its resolved color. */
export type ResolvedTextShadow = TextShadowValue & Readonly<{ color: string }>;
/** A theme glow with its resolved color. */
export type ResolvedGlow = GlowValue & Readonly<{ color: string }>;

/** A text role ready to draw, with its font resolved to a registered stack. */
export type ResolvedTypeStyle = Readonly<{
  fontId: VideoFontId;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight?: number;
  /** In em. */
  letterSpacing?: number;
  textTransform?: (typeof TEXT_TRANSFORMS)[number];
  fontVariantNumeric?: "normal" | "tabular-nums";
  color: string;
  alpha: number;
  textShadow?: ResolvedTextShadow;
  glow?: ResolvedGlow;
  strokeWidth?: number;
}>;
/** A resolved color and alpha pair for rendering. */
export type ResolvedPaint = Readonly<{ color: string; alpha: number }>;
/** Resolved shadow layers and their shared color. */
export type ResolvedElevation = Readonly<{
  layers: readonly ShadowLayer[];
  color: string;
}>;
/** Resolved geometry variation parameters for sketched shapes. */
export type ResolvedSketchProfile = Readonly<{
  roughness: number;
  bowing: number;
  seed: number;
  randomness: number;
}>;
/** Resolved optional spacing values for box sides and layout gaps. */
export type ResolvedBox = Readonly<
  Partial<
    Record<"top" | "right" | "bottom" | "left" | "x" | "y" | "gap", number>
  >
>;
/** Resolved timing, easing, spring, and distance values for motion. */
export type ResolvedMotionStep = Readonly<{
  duration?: number;
  easing?: EasingValue;
  distance?: number;
  spring?: SpringValue;
  period?: number;
  rate?: number;
  stagger?: number;
}>;
/** Resolved camera speed, shutter, and easing values. */
export type ResolvedCameraPreset = Readonly<{
  speed: number;
  shutter: number;
  easing: EasingValue;
}>;
/** An inclusive numeric range with minimum and maximum values. */
export type ResolvedRange = Readonly<{ min: number; max: number }>;

/** The resolved value of each token kind. */
export type TokenKindValues = {
  color: string;
  colorTuple: readonly string[];
  paletteName: string;
  shade: ShadeValue;
  gradient: GradientValue;
  fontStack: string;
  cssLength: string;
  cssNumber: string;
  length: number;
  number: number;
  opacity: number;
  duration: number;
  letterSpacing: number;
  fontWeight: number;
  easing: EasingValue;
  spring: SpringValue;
  shadow: ShadowValue;
  glow: GlowValue;
  textShadow: TextShadowValue;
  dash: readonly number[];
  fontFamily: VideoFontId;
  enum: string;
  boolean: boolean;
  fill: ResolvedFill;
  typeStyle: ResolvedTypeStyle;
  paint: ResolvedPaint;
  elevation: ResolvedElevation;
  sketchProfile: ResolvedSketchProfile;
  box: ResolvedBox;
  motionStep: ResolvedMotionStep;
  cameraPreset: ResolvedCameraPreset;
  range: ResolvedRange;
};
/** A kind supported by the theme token value map. */
export type TokenKind = keyof TokenKindValues;
/** A unit displayed alongside a numeric theme token. */
export type TokenUnit = "px" | "em" | "%" | "frames" | "deg" | "cps" | "×";
/** The pixel space a length or text role is measured in. */
export type TokenSurface = "graphic" | "stage";

/** Metadata for one token: what it is, how to edit it, and its bounds. */
export type TokenDefinition = Readonly<{
  kind: TokenKind;
  label: string;
  description: string;
  unit?: TokenUnit;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
  surface?: TokenSurface;
  /**
   * A theme may leave the token unset, and renderers then use their own
   * fallback. Its resolved value is undefined.
   */
  isOptional?: boolean;
  /**
   * For a colour pair: the token path of the colour that picks the pair
   * instead of the ground, such as `color.accent` for text drawn on the
   * accent. The pair's on-dark value is used when that colour's luminance is
   * at or below `contrastThreshold`.
   */
  contrastWith?: string;
  contrastThreshold?: number;
  /**
   * For a text role: the colour token it is drawn on when that is not the
   * ground, such as `color.scene.ground`. Contrast checks measure against it.
   */
  contrastGround?: string;
}>;
/** A catalog entry whose scale member defines its token. */
export type TokenScale = Readonly<{ scale: TokenDefinition }>;
/** Named child entries in the theme token catalog. */
export type CatalogGroup = Readonly<{ [key: string]: CatalogNode }>;
/** A token, scale entry, or nested group in the theme catalog. */
export type CatalogNode = TokenDefinition | TokenScale | CatalogGroup;

/** The resolved shape of a catalog subtree. */
export type ResolvedTokenNode<Node> = Node extends {
  readonly kind: infer Kind extends TokenKind;
}
  ? Node extends { readonly isOptional: true }
    ? TokenKindValues[Kind] | undefined
    : Node extends { readonly options: ReadonlyArray<infer Option> }
      ? Option
      : TokenKindValues[Kind]
  : Node extends { readonly scale: infer Definition }
    ? Exclude<keyof Node, "scale"> extends never
      ? Readonly<Record<string, ResolvedTokenNode<Definition>>>
      : { readonly [Key in keyof Node]: ResolvedTokenNode<Node[Key]> }
    : { readonly [Key in keyof Node]: ResolvedTokenNode<Node[Key]> };

/** Resolved values of the atomic video theme catalog. */
export type ResolvedVideoAtomic = ResolvedTokenNode<typeof ATOMIC_TOKENS>;
/** Resolved values of the semantic video theme catalog. */
export type ResolvedVideoSemantic = ResolvedTokenNode<typeof SEMANTIC_TOKENS>;
/** Resolved values of the video component theme catalog. */
export type ResolvedVideoComponents = ResolvedTokenNode<
  typeof COMPONENT_TOKENS
>;
/** A component name in the resolved video theme catalog. */
export type VideoComponentName = keyof ResolvedVideoComponents;

/** A sparse theme fragment: Mantine keys, `other.video`, and `components`. */
export type VideoThemePatch = Readonly<Record<string, unknown>>;

/** One `themes/<id>.theme.json` file. */
export type VideoThemeDocument = VideoThemePatch &
  Readonly<{
    schemaVersion: 1;
    id: string;
    label: string;
    extends?: string;
    overrides?: Readonly<Record<string, VideoThemePatch>>;
  }>;
/** Theme documents indexed by their stable identifiers. */
export type VideoThemeLibrary = ReadonlyMap<string, VideoThemeDocument>;

/**
 * Which per-item overrides and extra patches apply, lowest precedence first.
 */
export type VideoThemeScope = Readonly<{
  overrideIds?: readonly string[];
  patches?: readonly VideoThemePatch[];
}>;

/** Everything needed to resolve a theme for one item. */
export type VideoThemeSource = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  scope?: VideoThemeScope;
}>;

/** A theme with every reference resolved, ready for renderers and Mantine. */
export type ResolvedVideoTheme = Readonly<{
  id: string;
  label: string;
  /** Stable under authoring key order; changes when any resolved value does. */
  hash: string;
  isDarkGround: boolean;
  atomic: ResolvedVideoAtomic;
  semantic: ResolvedVideoSemantic;
  components: ResolvedVideoComponents;
  mantine: MantineTheme;
}>;
