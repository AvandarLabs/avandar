import {
  buildColorWithAlpha,
  elevationToBoxShadow,
  elevationToDropShadowFilter,
  fillToCss,
  textShadowToCss,
} from "../cssValueHelpers/cssValueHelpers";
import { getResolvedTokenValue } from "../getResolvedTokenValue";
import {
  isMantineTokenRoot,
  listTokenDefinitions,
} from "../tokenCatalog/tokenCatalogHelpers/tokenCatalogHelpers";
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
  return segment.replace(/[A-Z]/g, (letter) => {
    return `-${letter.toLowerCase()}`;
  });
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
function _elevationVariables(
  name: string,
  elevation: ResolvedElevation,
): Record<string, string> {
  return {
    [`${name}-box-shadow`]: elevationToBoxShadow(elevation),
    [`${name}-drop-shadow`]: elevationToDropShadowFilter(elevation),
  };
}
function _boxVariables(name: string, box: ResolvedBox): Record<string, string> {
  return Object.fromEntries(
    Object.entries(box).map(([side, pixels]) => {
      return [`${name}-${side}`, `${String(pixels)}px`];
    }),
  );
}
function _glowVariables(name: string, glow: GlowValue): Record<string, string> {
  return {
    [`${name}-spread`]: `${glow.spread}px`,
    [`${name}-blur`]: `${glow.blur}px`,
    [`${name}-opacity`]: String(glow.opacity),
  };
}
function _paintVariables(
  name: string,
  paint: ResolvedPaint,
): Record<string, string> {
  return { [name]: buildColorWithAlpha(paint.color, paint.alpha) };
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
    case "paint":
      return _paintVariables(name, value as ResolvedPaint);
    case "elevation":
      return _elevationVariables(name, value as ResolvedElevation);
    case "box":
      return _boxVariables(name, value as ResolvedBox);
    case "glow":
      return _glowVariables(name, value as GlowValue);
    default:
      return {};
  }
}
function _variableNameFromPath(segments: readonly string[]): string {
  return segments[0] === "components"
    ? `--video-component-${segments.slice(1).map(_kebab).join("-").replace(/^-/, "")}`
    : `--video-${segments.map(_kebab).join("-")}`;
}
function _isSkippedPath(path: string, isScale: boolean): boolean {
  const [root = ""] = path.split(".");
  return (
    isScale ||
    root === "atomic" ||
    isMantineTokenRoot(root) ||
    UNSTYLED_GROUPS.has(root)
  );
}
/**
 * CSS custom properties for every styled semantic and component token, such
 * as `--video-color-ground` and `--video-text-stage-heading-font-size`, plus
 * the scene palette under its storyboard names (`--brand`, `--ground`, ...).
 * `VideoThemeProvider` sets them on its container so CSS modules and scene
 * styles read the theme without JavaScript; a storyboard theme set inside
 * still overrides the scene names. Motion, camera, and sketch tokens have no
 * CSS meaning and are skipped.
 */
export function buildVideoCssVariables(
  theme: ResolvedVideoTheme,
): Record<string, string> {
  const variableSets = listTokenDefinitions()
    .filter(({ path, isScale }) => {
      return !_isSkippedPath(path, isScale);
    })
    .flatMap(({ path, definition }) => {
      const value = getResolvedTokenValue(theme, path);
      return value === undefined
        ? []
        : [
            _variablesFromValue(
              definition.kind,
              _variableNameFromPath(path.split(".")),
              value,
            ),
          ];
    });
  return Object.fromEntries([
    ...variableSets.flatMap((variables) => {
      return Object.entries(variables);
    }),
    ...Object.entries(
      Object.fromEntries(
        Object.entries(theme.semantic.color.scene).flatMap(([name, color]) => {
          return color === undefined ? [] : [[`--${_kebab(name)}`, color]];
        }),
      ),
    ),
  ]);
}
