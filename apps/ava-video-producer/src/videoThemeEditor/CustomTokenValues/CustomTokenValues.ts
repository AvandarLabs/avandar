import { capitalize } from "@avandar/utils";
import { ThemeReferences } from "../../videoTheme/ThemeReferences/ThemeReferences";
import { CUSTOM_SCALE_KEY_PREFIX } from "../CustomScaleKeys/CustomScaleKeys";
import { setValueAtPath } from "../setValueAtPath";
import {
  type ThemeDraft,
  type ThemeEditScope,
  ThemeDrafts,
} from "../ThemeDrafts/ThemeDrafts";
import type { TokenKind } from "../../videoTheme/videoTheme.types";

const MANTINE_SCALES = new Set([
  "fontSizes",
  "lineHeights",
  "radius",
  "spacing",
]);
const PIXEL_SCALES = new Set(["fontSizes", "radius", "spacing"]);
/**
 * Where a custom value of a kind goes when its current reference names no
 * scale.
 */
const FALLBACK_SCALES: Partial<Record<TokenKind, string>> = {
  color: "atomic.swatch",
  textShadow: "atomic.textShadow",
  glow: "atomic.glow",
  shadow: "atomic.shadow",
  easing: "atomic.easing",
  spring: "atomic.spring",
  dash: "atomic.dash",
  duration: "atomic.duration",
  opacity: "atomic.opacity",
  letterSpacing: "atomic.letterSpacing",
  fontWeight: "atomic.fontWeight",
  fontFamily: "atomic.fontFamily",
};
/**
 * A request to give a semantic token, or one field of it, a value of its own.
 */
export type CustomValueRequest = Readonly<{
  tokenPath: string;
  /** Empty for the token itself, or the composite field, such as `["size"]`. */
  fieldPath: readonly string[];
  /** The token's whole authored value in this scope. */
  currentValue: unknown;
  /** The field's authored value: usually a reference. */
  currentReference: unknown;
  kind: TokenKind;
  literal: unknown;
}>;
type CustomDraftValueOptions = {
  draft: ThemeDraft;
  scope: ThemeEditScope;
  request: CustomValueRequest;
};

/**
 * The scale a custom value lands in: the scale the current reference points
 * into (such as `fontSizes` for `$fontSizes.7xl`), otherwise the kind's
 * usual atomic scale, otherwise none. Semantic tokens hold only references,
 * so a custom value becomes a named scale entry.
 */
function _getCustomScaleFromReference(
  options: Readonly<{
    reference: unknown;
    kind: TokenKind;
  }>,
): string | undefined {
  const { reference, kind } = options;
  if (ThemeReferences.isTokenReference(reference)) {
    const target = ThemeReferences.getTargetFromTokenReference(reference);
    if (target.tier === "atomic" && target.path.length === 2) {
      return `atomic.${target.path[0]}`;
    }
    if (
      target.tier === "mantine" &&
      target.path.length === 2 &&
      MANTINE_SCALES.has(target.path[0])
    ) {
      return target.path[0];
    }
  }
  return FALLBACK_SCALES[kind];
}
/**
 * The scale key for a custom value, such as `customColorAccent`, at most 32
 * characters.
 */
function _makeCustomScaleKeyFromPath(path: readonly string[]): string {
  const words = path
    .flatMap((segment) => {
      return segment.split(/[^A-Za-z0-9]+/);
    })
    .filter(Boolean);
  return `${CUSTOM_SCALE_KEY_PREFIX}${words
    .map((word) => {
      return capitalize(word);
    })
    .join("")}`.slice(0, 32);
}
function _toScaleLiteral({
  scale,
  literal,
}: Readonly<{
  scale: string;
  literal: unknown;
}>): unknown {
  return PIXEL_SCALES.has(scale) && typeof literal === "number"
    ? `${literal}px`
    : scale === "lineHeights" && typeof literal === "number"
      ? String(literal)
      : literal;
}
/**
 * A draft where a semantic token (or one field of it) points at a new
 * scale entry holding a custom value, in the same scope. Unchanged when no
 * scale fits.
 */
function _setCustomValueInDraft(
  options: Readonly<CustomDraftValueOptions>,
): ThemeDraft {
  const { draft, scope, request } = options;
  const scale = _getCustomScaleFromReference({
    reference: request.currentReference,
    kind: request.kind,
  });
  if (!scale) {
    return draft;
  }
  const key = _makeCustomScaleKeyFromPath([
    ...request.tokenPath.split("."),
    ...request.fieldPath,
  ]);
  const reference = `$${scale}.${key}`;
  const withEntry = ThemeDrafts.setTokenInDraft({
    draft,
    scope,
    tokenPath: `${scale}.${key}`,
    value: _toScaleLiteral({
      scale,
      literal: request.literal,
    }),
  });
  const current =
    typeof request.currentValue === "object" && request.currentValue !== null
      ? (request.currentValue as Readonly<Record<string, unknown>>)
      : {};
  const tokenValue =
    request.fieldPath.length === 0
      ? reference
      : setValueAtPath({
          source: current,
          path: request.fieldPath,
          value: reference,
        });
  return ThemeDrafts.setTokenInDraft({
    draft: withEntry,
    scope,
    tokenPath: request.tokenPath,
    value: tokenValue,
  });
}

/** Creates and applies custom atomic values for video theme editor controls. */
export const CustomTokenValues = {
  /**
   * The scale a custom value lands in: the scale the current reference points
   * into (such as `fontSizes` for `$fontSizes.7xl`), otherwise the kind's usual
   * atomic scale, otherwise none.
   */
  getCustomScaleFromReference: _getCustomScaleFromReference,
  /**
   * The scale key for a custom value, such as `customColorAccent`, at most 32
   * characters.
   */
  makeCustomScaleKeyFromPath: _makeCustomScaleKeyFromPath,
  /**
   * A draft where a semantic token (or one field of it) points at a new scale
   * entry holding a custom value, in the same scope.
   */
  setCustomValueInDraft: _setCustomValueInDraft,
};
