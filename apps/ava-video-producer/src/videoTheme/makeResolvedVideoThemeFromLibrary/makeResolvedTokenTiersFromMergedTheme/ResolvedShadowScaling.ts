import { makeObjectFromEntries } from "@avandar/utils";
import { getValueAtPath } from "../../getValueAtPath";
import { TokenDefinitions } from "../../tokenCatalog/TokenDefinitions";
import { ResolvedTokenGuards } from "./ResolvedTokenGuards";
import { type UnknownRecord } from "./ResolvedTokenTiers.types";
import type { CatalogNode } from "../../videoTheme.types";
/** The catalog location and resolved value whose shadow strength is applied. */
type ShadowScaleOptions = {
  node: CatalogNode;
  value: unknown;
  strength: number;
};

function _finishElevation(fields: UnknownRecord): unknown {
  const shadow = fields.shadow;
  return !ResolvedTokenGuards.isRecord(shadow) || fields.color === undefined
    ? undefined
    : { layers: shadow.layers, color: fields.color };
}
/**
 * Every resolved shadow and elevation under a catalog node with its layer
 * opacities multiplied by `strength`, so `elevation.strength` reaches every
 * shadow a renderer reads. Values come back unchanged at strength 1.
 */
function _scaleShadows({
  node,
  value,
  strength,
}: Readonly<ShadowScaleOptions>): unknown {
  if (
    TokenDefinitions.isTokenScale(node) ||
    !ResolvedTokenGuards.isRecord(value)
  ) {
    return value;
  }
  if (TokenDefinitions.isTokenDefinition(node)) {
    if (
      (node.kind !== "elevation" && node.kind !== "shadow") ||
      !Array.isArray(value.layers)
    ) {
      return value;
    }
    const layers: ReadonlyArray<
      Readonly<{
        alpha: number;
      }>
    > = value.layers;
    return {
      ...value,
      layers: layers.map((layer) => {
        return { ...layer, alpha: Math.min(1, layer.alpha * strength) };
      }),
    };
  }
  return makeObjectFromEntries(
    Object.entries(value).map(([key, child]) => {
      const childNode = node[key];
      return [
        key,
        childNode
          ? _scaleShadows({ node: childNode, value: child, strength })
          : child,
      ];
    }),
  );
}
function _getShadowStrength(semantic: unknown): number {
  const strength = getValueAtPath({
    source: semantic,
    path: ["elevation", "strength"],
  });
  return typeof strength === "number" ? strength : 1;
}
/** `_scaleShadows`, skipped at strength 1 so the value is returned as is. */
function _scaleShadowsByStrength({
  node,
  value,
  strength,
}: Readonly<ShadowScaleOptions>): unknown {
  return strength === 1 ? value : _scaleShadows({ node, value, strength });
}
/**
 * Finishes elevation values and applies themed intensity to resolved shadow
 * layers.
 */
export const ResolvedShadowScaling = {
  /** The resolved shadow layers with their selected color. */
  finishElevation: _finishElevation,
  /** The resolved intensity multiplier, defaulting to one. */
  getShadowStrength: _getShadowStrength,
  /** Applies shadow intensity while preserving identity at strength one. */
  scaleShadowsByStrength: _scaleShadowsByStrength,
} as const;
