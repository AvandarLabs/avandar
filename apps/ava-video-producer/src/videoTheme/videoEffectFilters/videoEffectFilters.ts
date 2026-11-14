import { getResolvedTokenValue } from "../getResolvedTokenValue/getResolvedTokenValue";
import { listTokenDefinitions } from "../tokenCatalog/tokenCatalog";
import type {
  GlowValue,
  ResolvedElevation,
  ResolvedTypeStyle,
  ResolvedVideoTheme,
  TokenKind,
} from "../videoTheme.types";

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
  | Readonly<{ kind: "blur"; stdDeviation: number }>;

/** A filter a graphic shape references, keyed by the token that defines it. */
export type VideoEffectFilter = Readonly<{
  path: string;
  primitives: readonly EffectPrimitive[];
}>;

const FILTERS = new WeakMap<ResolvedVideoTheme, readonly VideoEffectFilter[]>();

/** The SVG id of a token's filter inside one stock graphic. */
export function buildEffectFilterId(graphicId: string, path: string): string {
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

function _primitivesFromValue(
  kind: TokenKind,
  value: unknown,
): EffectPrimitive[] {
  if (kind === "typeStyle") {
    return _typeStylePrimitives(value as ResolvedTypeStyle);
  }
  if (kind === "elevation") {
    return _elevationPrimitives(value as ResolvedElevation);
  }
  if (kind === "glow") {
    const glow = value as GlowValue;
    return glow.blur > 0
      ? [{ kind: "blur" as const, stdDeviation: glow.blur / 2 }]
      : [];
  }
  return [];
}

/**
 * The SVG filters a theme needs on the graphic surface: text shadows and
 * glows on graphic type roles, graphic elevations, and blurred glows. Only
 * tokens that set an effect produce a filter, so `classic` produces none.
 * Stage effects use CSS instead. Cached per resolved theme.
 */
export function listVideoEffectFilters(
  theme: ResolvedVideoTheme,
): readonly VideoEffectFilter[] {
  const cached = FILTERS.get(theme);
  if (cached) {
    return cached;
  }
  const filters = listTokenDefinitions()
    .filter(({ definition, isScale }) => {
      return !isScale && definition.surface === "graphic";
    })
    .flatMap(({ path, definition }) => {
      const primitives = _primitivesFromValue(
        definition.kind,
        getResolvedTokenValue(theme, path),
      );
      return primitives.length > 0 ? [{ path, primitives }] : [];
    });
  FILTERS.set(theme, filters);
  return filters;
}
