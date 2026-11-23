import { match, P } from "ts-pattern";
import { getResolvedTokenValue } from "../getResolvedTokenValue";
import { TokenCatalog } from "../tokenCatalog/TokenCatalog/TokenCatalog";
import { VideoCssValues } from "../VideoCssValues/VideoCssValues";
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

const UNHANDLED_VARIABLES_FROM_VALUE_KINDS = [
  "colorTuple",
  "paletteName",
  "shade",
  "gradient",
  "fontStack",
  "cssLength",
  "cssNumber",
  "easing",
  "spring",
  "shadow",
  "textShadow",
  "dash",
  "fontFamily",
  "enum",
  "boolean",
  "sketchProfile",
  "motionStep",
  "cameraPreset",
  "range",
] as const;

const UNSTYLED_GROUPS = new Set(["motion", "camera", "motionBlur", "sketch"]);
function _kebab(segment: string): string {
  return segment.replace(/[A-Z]/g, (letter) => {
    return `-${letter.toLowerCase()}`;
  });
}
function _typeStyleVariables({
  name,
  style,
}: Readonly<{
  name: string;
  style: ResolvedTypeStyle;
}>): Record<string, string> {
  return {
    [`${name}-font-family`]: style.fontFamily,
    [`${name}-font-size`]: `${style.fontSize}px`,
    [`${name}-font-weight`]: String(style.fontWeight),
    [`${name}-color`]: VideoCssValues.makeColorFromAlpha({
      color: style.color,
      alpha: style.alpha,
    }),
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
      ? {
          [`${name}-text-shadow`]: VideoCssValues.makeCssFromTextShadow(
            style.textShadow,
          ),
        }
      : {}),
  };
}
function _elevationVariables({
  name,
  elevation,
}: Readonly<{
  name: string;
  elevation: ResolvedElevation;
}>): Record<string, string> {
  return {
    [`${name}-box-shadow`]:
      VideoCssValues.makeBoxShadowFromElevation(elevation),
    [`${name}-drop-shadow`]:
      VideoCssValues.makeDropShadowFilterFromElevation(elevation),
  };
}
function _boxVariables({
  name,
  box,
}: Readonly<{
  name: string;
  box: ResolvedBox;
}>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(box).map(([side, pixels]) => {
      return [`${name}-${side}`, `${String(pixels)}px`];
    }),
  );
}
function _glowVariables({
  name,
  glow,
}: Readonly<{
  name: string;
  glow: GlowValue;
}>): Record<string, string> {
  return {
    [`${name}-spread`]: `${glow.spread}px`,
    [`${name}-blur`]: `${glow.blur}px`,
    [`${name}-opacity`]: String(glow.opacity),
  };
}
function _paintVariables({
  name,
  paint,
}: Readonly<{
  name: string;
  paint: ResolvedPaint;
}>): Record<string, string> {
  return {
    [name]: VideoCssValues.makeColorFromAlpha({
      color: paint.color,
      alpha: paint.alpha,
    }),
  };
}
function _variablesFromValue({
  kind,
  name,
  value,
}: Readonly<{
  kind: TokenKind;
  name: string;
  value: unknown;
}>): Record<string, string> {
  return match(kind)
    .with("color", () => {
      return { [name]: String(value) };
    })
    .with("fill", () => {
      return {
        [name]: VideoCssValues.makeCssFromFill(value as ResolvedFill),
      };
    })
    .with("length", () => {
      return { [name]: `${String(value)}px` };
    })
    .with("letterSpacing", () => {
      return { [name]: `${String(value)}em` };
    })
    .with("number", "opacity", "fontWeight", "duration", () => {
      return {
        [name]: String(value),
      };
    })
    .with("typeStyle", "paint", "elevation", "box", "glow", (matchedKind) => {
      return _getCompositeVariablesFromValue({
        kind: matchedKind,
        name,
        value,
      });
    })
    .with(P.union(...UNHANDLED_VARIABLES_FROM_VALUE_KINDS), () => {
      return {};
    })
    .exhaustive();
}
function _variableNameFromPath(segments: readonly string[]): string {
  return segments[0] === "components"
    ? `--video-component-${segments.slice(1).map(_kebab).join("-").replace(/^-/, "")}`
    : `--video-${segments.map(_kebab).join("-")}`;
}
function _isSkippedPath({
  path,
  isScale,
}: Readonly<{
  path: string;
  isScale: boolean;
}>): boolean {
  const [root = ""] = path.split(".");
  return (
    isScale ||
    root === "atomic" ||
    TokenCatalog.isMantineTokenRoot(root) ||
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
export function makeVideoCssVariablesFromTheme(
  theme: ResolvedVideoTheme,
): Record<string, string> {
  const variableSets = TokenCatalog.listTokenDefinitions()
    .filter(({ path, isScale }) => {
      return !_isSkippedPath({
        path,
        isScale,
      });
    })
    .flatMap(({ path, definition }) => {
      const value = getResolvedTokenValue({
        theme,
        path,
      });
      return value === undefined
        ? []
        : [
            _variablesFromValue({
              kind: definition.kind,
              name: _variableNameFromPath(path.split(".")),
              value,
            }),
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

function _getCompositeVariablesFromValue({
  kind,
  name,
  value,
}: Readonly<{
  kind: "typeStyle" | "paint" | "elevation" | "box" | "glow";
  name: string;
  value: unknown;
}>): Record<string, string> {
  return match(kind)
    .with("typeStyle", () => {
      return _typeStyleVariables({
        name,
        style: value as ResolvedTypeStyle,
      });
    })
    .with("paint", () => {
      return _paintVariables({
        name,
        paint: value as ResolvedPaint,
      });
    })
    .with("elevation", () => {
      return _elevationVariables({
        name,
        elevation: value as ResolvedElevation,
      });
    })
    .with("box", () => {
      return _boxVariables({
        name,
        box: value as ResolvedBox,
      });
    })
    .with("glow", () => {
      return _glowVariables({
        name,
        glow: value as GlowValue,
      });
    })
    .exhaustive();
}
