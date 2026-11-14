import {
  buildColorWithAlpha,
  elevationToBoxShadow,
  elevationToDropShadowFilter,
  fillToCss,
  textShadowToCss,
} from "../cssValues/cssValues";
import { getResolvedTokenValue } from "../getResolvedTokenValue/getResolvedTokenValue";
import {
  isMantineTokenRoot,
  listTokenDefinitions,
} from "../tokenCatalog/tokenCatalog";
import type {
  GlowValue,
  ResolvedBox,
  ResolvedElevation,
  ResolvedFill,
  ResolvedPaint,
  ResolvedTypeStyle,
  ResolvedVideoTheme,
  TokenKind,
} from "../videoTheme.types";

const UNSTYLED_GROUPS = new Set(["motion", "camera", "motionBlur", "sketch"]);

function _kebab(segment: string): string {
  return segment.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function _typeStyleVariables(
  name: string,
  style: ResolvedTypeStyle,
): Record<string, string> {
  return {
    [`${name}-font-family`]: style.fontFamily,
    [`${name}-font-size`]: `${style.fontSize}px`,
    [`${name}-font-weight`]: String(style.fontWeight),
    [`${name}-color`]: buildColorWithAlpha(style.color, style.alpha),
    ...(style.lineHeight === undefined
      ? {}
      : { [`${name}-line-height`]: String(style.lineHeight) }),
    ...(style.letterSpacing === undefined
      ? {}
      : { [`${name}-letter-spacing`]: `${style.letterSpacing}em` }),
    ...(style.textTransform
      ? { [`${name}-text-transform`]: style.textTransform }
      : {}),
    ...(style.fontVariantNumeric
      ? { [`${name}-font-variant-numeric`]: style.fontVariantNumeric }
      : {}),
    ...(style.textShadow
      ? { [`${name}-text-shadow`]: textShadowToCss(style.textShadow) }
      : {}),
  };
}

function _variablesFromValue(
  kind: TokenKind,
  name: string,
  value: unknown,
): Record<string, string> {
  switch (kind) {
    case "color":
      return { [name]: String(value) };
    case "fill":
      return { [name]: fillToCss(value as ResolvedFill) };
    case "length":
      return { [name]: `${String(value)}px` };
    case "letterSpacing":
      return { [name]: `${String(value)}em` };
    case "number":
    case "opacity":
    case "fontWeight":
    case "duration":
      return { [name]: String(value) };
    case "typeStyle":
      return _typeStyleVariables(name, value as ResolvedTypeStyle);
    case "paint": {
      const paint = value as ResolvedPaint;
      return { [name]: buildColorWithAlpha(paint.color, paint.alpha) };
    }
    case "elevation":
      return {
        [`${name}-box-shadow`]: elevationToBoxShadow(
          value as ResolvedElevation,
        ),
        [`${name}-drop-shadow`]: elevationToDropShadowFilter(
          value as ResolvedElevation,
        ),
      };
    case "box":
      return Object.fromEntries(
        Object.entries(value as ResolvedBox).map(([side, pixels]) => [
          `${name}-${side}`,
          `${String(pixels)}px`,
        ]),
      );
    case "glow": {
      const glow = value as GlowValue;
      return {
        [`${name}-spread`]: `${glow.spread}px`,
        [`${name}-blur`]: `${glow.blur}px`,
        [`${name}-opacity`]: String(glow.opacity),
      };
    }
    default:
      return {};
  }
}

function _variableNameFromPath(segments: readonly string[]): string {
  return segments[0] === "components"
    ? `--video-component-${segments.slice(1).map(_kebab).join("-").replace(/^-/, "")}`
    : `--video-${segments.map(_kebab).join("-")}`;
}

/**
 * CSS custom properties for every styled semantic and component token, such
 * as `--video-color-ground` and `--video-text-stage-heading-font-size`.
 * `VideoThemeProvider` sets them on its container so CSS modules (the
 * continuity stage and overlays) read the theme without JavaScript. Motion,
 * camera, and sketch tokens have no CSS meaning and are skipped.
 */
export function buildVideoCssVariables(
  theme: ResolvedVideoTheme,
): Readonly<Record<string, string>> {
  const variables: Record<string, string> = {};
  for (const { path, definition, isScale } of listTokenDefinitions()) {
    const segments = path.split(".");
    const [root = ""] = segments;
    const isSkipped =
      isScale ||
      root === "atomic" ||
      isMantineTokenRoot(root) ||
      UNSTYLED_GROUPS.has(root);
    const value = isSkipped ? undefined : getResolvedTokenValue(theme, path);
    if (value !== undefined) {
      Object.assign(
        variables,
        _variablesFromValue(
          definition.kind,
          _variableNameFromPath(segments),
          value,
        ),
      );
    }
  }
  return variables;
}
