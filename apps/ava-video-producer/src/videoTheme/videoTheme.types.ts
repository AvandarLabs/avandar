import type { ATOMIC_TOKENS } from "./tokenCatalog/atomicTokens";
import type { COMPONENT_TOKENS } from "./tokenCatalog/componentTokens";
import type { SEMANTIC_TOKENS } from "./tokenCatalog/semanticTokens";
import type { VideoFontId } from "./videoFontRegistry/videoFontRegistryHelpers";
/*
 * Types shared by the video theme model: authored values, token metadata,
 * theme documents, and the resolved values renderers read.
 */
import type { MantineTheme } from "@mantine/core";

/** A `$path` reference from one token to another, such as `$atomic.strokeWidth.sm`. */
export type TokenReference = `$${string}`;

/** Where a theme problem is, by token path, and what it is. */
export type VideoThemeIssue = Readonly<{ path: string; message: string }>;

/** Cubic Bezier control points `[x1, y1, x2, y2]`, or a symmetric power curve. */
export type EasingValue =
  | readonly [number, number, number, number]
  | Readonly<{ powerInOut: number }>;
export type SpringValue = Readonly<{
  damping: number;
  stiffness: number;
  mass: number;
}>;
export type ShadowLayer = Readonly<{
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  alpha: number;
}>;
export type ShadowValue = Readonly<{ layers: readonly ShadowLayer[] }>;
export type GlowValue = Readonly<{
  spread: number;
  blur: number;
  opacity: number;
}>;
export type TextShadowValue = Readonly<{
  offsetX: number;
  offsetY: number;
  blur: number;
  alpha: number;
}>;
export type GradientValue = Readonly<{ from: string; to: string; deg: number }>;
export type ShadeValue = number | Readonly<{ light: number; dark: number }>;

export type ResolvedFill =
  | Readonly<{ type: "solid"; color: string }>
  | Readonly<{ type: "gradient"; from: string; to: string; deg: number }>;
export type ResolvedTextShadow = TextShadowValue & Readonly<{ color: string }>;
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
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  fontVariantNumeric?: "normal" | "tabular-nums";
  color: string;
  alpha: number;
  textShadow?: ResolvedTextShadow;
  glow?: ResolvedGlow;
  strokeWidth?: number;
}>;
export type ResolvedPaint = Readonly<{ color: string; alpha: number }>;
export type ResolvedElevation = Readonly<{
  layers: readonly ShadowLayer[];
  color: string;
}>;
export type ResolvedSketchProfile = Readonly<{
  roughness: number;
  bowing: number;
  seed: number;
  randomness: number;
}>;
export type ResolvedBox = Readonly<
  Partial<
    Record<"top" | "right" | "bottom" | "left" | "x" | "y" | "gap", number>
  >
>;
export type ResolvedMotionStep = Readonly<{
  duration?: number;
  easing?: EasingValue;
  distance?: number;
  spring?: SpringValue;
  period?: number;
  rate?: number;
}>;
export type ResolvedCameraPreset = Readonly<{
  speed: number;
  shutter: number;
  easing: EasingValue;
}>;
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
export type TokenKind = keyof TokenKindValues;
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
}>;
export type TokenScale = Readonly<{ scale: TokenDefinition }>;
export type CatalogGroup = Readonly<{ [key: string]: CatalogNode }>;
export type CatalogNode = TokenDefinition | TokenScale | CatalogGroup;

/** The resolved shape of a catalog subtree. */
export type ResolvedTokenNode<Node> = Node extends {
  readonly kind: infer Kind extends TokenKind;
}
  ? Node extends { readonly options: ReadonlyArray<infer Option> }
    ? Option
    : TokenKindValues[Kind]
  : Node extends { readonly scale: infer Definition }
    ? Readonly<Record<string, ResolvedTokenNode<Definition>>>
    : { readonly [Key in keyof Node]: ResolvedTokenNode<Node[Key]> };

export type ResolvedVideoAtomic = ResolvedTokenNode<typeof ATOMIC_TOKENS>;
export type ResolvedVideoSemantic = ResolvedTokenNode<typeof SEMANTIC_TOKENS>;
export type ResolvedVideoComponents = ResolvedTokenNode<
  typeof COMPONENT_TOKENS
>;
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
export type VideoThemeLibrary = ReadonlyMap<string, VideoThemeDocument>;

/** Which per-item overrides and extra patches apply, lowest precedence first. */
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
