import { match, P } from "ts-pattern";
import { getResolvedTokenValue } from "../getResolvedTokenValue";
import { TokenCatalog } from "../tokenCatalog/TokenCatalog/TokenCatalog";
import type {
  GlowValue,
  ResolvedElevation,
  ResolvedTypeStyle,
  ResolvedVideoTheme,
  TokenKind,
} from "../videoTheme.types";

const KINDS_WITHOUT_EFFECTS = [
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
  "textShadow",
  "dash",
  "fontFamily",
  "enum",
  "boolean",
  "fill",
  "paint",
  "sketchProfile",
  "box",
  "motionStep",
  "cameraPreset",
  "range",
] as const;

/** One SVG filter step. */
export type EffectPrimitive =
  | Readonly<{
      kind: "dropShadow";
      dx: number;
      dy: number;
      stdDeviation: number;
      color: string;
      opacity: number;
    }>
  | Readonly<{
      kind: "glow";
      stdDeviation: number;
      color: string;
      opacity: number;
    }>
  | Readonly<{
      kind: "blur";
      stdDeviation: number;
    }>;
/** A filter a graphic shape references, keyed by the token that defines it. */
export type VideoEffectFilter = Readonly<{
  path: string;
  primitives: readonly EffectPrimitive[];
}>;
const FILTERS = new WeakMap<ResolvedVideoTheme, readonly VideoEffectFilter[]>();
/** The SVG id of a token's filter inside one stock graphic. */
function _makeFilterIdFromTheme({
  graphicId,
  path,
}: Readonly<{
  graphicId: string;
  path: string;
}>): string {
  return `${graphicId}-fx-${path.replaceAll(".", "-")}`;
}
function _typeStylePrimitives(style: ResolvedTypeStyle): EffectPrimitive[] {
  const shadow = style.textShadow;
  const glow = style.glow;
  return [
    ...(shadow && shadow.alpha > 0
      ? [
          {
            kind: "dropShadow" as const,
            dx: shadow.offsetX,
            dy: shadow.offsetY,
            stdDeviation: shadow.blur / 2,
            color: shadow.color,
            opacity: shadow.alpha,
          },
        ]
      : []),
    ...(glow && glow.opacity > 0
      ? [
          {
            kind: "glow" as const,
            stdDeviation: glow.blur / 2,
            color: glow.color,
            opacity: glow.opacity,
          },
        ]
      : []),
  ];
}
function _elevationPrimitives(elevation: ResolvedElevation): EffectPrimitive[] {
  return elevation.layers.map((layer) => {
    return {
      kind: "dropShadow" as const,
      dx: layer.offsetX,
      dy: layer.offsetY,
      stdDeviation: layer.blur / 2,
      color: elevation.color,
      opacity: layer.alpha,
    };
  });
}
function _primitivesFromValue({
  kind,
  value,
}: Readonly<{
  kind: TokenKind;
  value: unknown;
}>): EffectPrimitive[] {
  return match(kind)
    .with("typeStyle", () => {
      return _typeStylePrimitives(value as ResolvedTypeStyle);
    })
    .with("elevation", () => {
      return _elevationPrimitives(value as ResolvedElevation);
    })
    .with("glow", () => {
      const glow = value as GlowValue;
      return glow.blur > 0
        ? [{ kind: "blur" as const, stdDeviation: glow.blur / 2 }]
        : [];
    })
    .with(P.union(...KINDS_WITHOUT_EFFECTS), () => {
      return [];
    })
    .exhaustive();
}
/**
 * The SVG filters a theme needs on the graphic surface: text shadows and
 * glows on graphic type roles, graphic elevations, and blurred glows. Only
 * tokens that set an effect produce a filter, so `classic` produces none.
 * Stage effects use CSS instead. Cached per resolved theme.
 */
function _listVideoEffectFilters(
  theme: ResolvedVideoTheme,
): readonly VideoEffectFilter[] {
  const cached = FILTERS.get(theme);
  if (cached) {
    return cached;
  }
  const filters = TokenCatalog.listTokenDefinitions()
    .filter(({ definition, isScale }) => {
      return !isScale && definition.surface === "graphic";
    })
    .flatMap(({ path, definition }) => {
      const primitives = _primitivesFromValue({
        kind: definition.kind,
        value: getResolvedTokenValue({
          theme,
          path,
        }),
      });
      return primitives.length > 0 ? [{ path, primitives }] : [];
    });
  FILTERS.set(theme, filters);
  return filters;
}

/** Lists SVG effect filters and identifies them for themed renderers. */
export const VideoEffectFilters = {
  /** The SVG id of a token's filter inside one stock graphic. */
  makeFilterIdFromTheme: _makeFilterIdFromTheme,
  /**
   * The SVG filters a theme needs on the graphic surface: text shadows and
   * glows on graphic type roles, graphic elevations, and blurred glows.
   */
  listVideoEffectFilters: _listVideoEffectFilters,
};
