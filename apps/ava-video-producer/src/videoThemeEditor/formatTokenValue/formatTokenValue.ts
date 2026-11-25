import { match, P } from "ts-pattern";
import { parseCssPixels } from "../../videoTheme/parseCssPixels/parseCssPixels";
import {
  VIDEO_FONT_REGISTRY,
  type VideoFontId,
  VideoFonts,
} from "../../videoTheme/videoFontRegistry/VideoFonts";
import type {
  EasingValue,
  GlowValue,
  GradientValue,
  ResolvedCameraPreset,
  ResolvedFill,
  ResolvedMotionStep,
  ResolvedPaint,
  ResolvedRange,
  ResolvedSketchProfile,
  ResolvedTypeStyle,
  ShadeValue,
  ShadowValue,
  SpringValue,
  TextShadowValue,
  TokenKind,
} from "../../videoTheme/videoTheme.types";

const UNHANDLED_FORMAT_EFFECT_KINDS = [
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
  "fontFamily",
  "enum",
  "boolean",
  "fill",
  "typeStyle",
  "paint",
  "box",
  "motionStep",
  "cameraPreset",
  "range",
] as const;
const UNHANDLED_FORMAT_STRUCTURE_KINDS = [
  "color",
  "colorTuple",
  "paletteName",
  "shade",
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
  "glow",
  "textShadow",
  "dash",
  "fontFamily",
  "enum",
  "boolean",
  "elevation",
  "sketchProfile",
  "box",
  "motionStep",
] as const;
const UNHANDLED_FORMAT_COLLECTION_KINDS = [
  "color",
  "paletteName",
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
  "glow",
  "textShadow",
  "dash",
  "fontFamily",
  "enum",
  "boolean",
  "fill",
  "typeStyle",
  "paint",
  "elevation",
  "sketchProfile",
  "cameraPreset",
  "range",
] as const;
const UNHANDLED_FORMAT_TOKEN_VALUE_KINDS = [
  "color",
  "colorTuple",
  "paletteName",
  "shade",
  "gradient",
  "spring",
  "shadow",
  "glow",
  "textShadow",
  "dash",
  "enum",
  "boolean",
  "fill",
  "typeStyle",
  "paint",
  "elevation",
  "sketchProfile",
  "box",
  "motionStep",
  "cameraPreset",
  "range",
] as const;

function _number(value: number): string {
  return String(Number(value.toFixed(3)));
}
function _percent(value: number): string {
  return `${_number(value * 100)}%`;
}
function _milliseconds(frames: number): string {
  return `${Math.round((frames / 30) * 1000)} ms`;
}
function _fontLabel(value: string): string {
  const id = Object.hasOwn(VIDEO_FONT_REGISTRY, value)
    ? (value as VideoFontId)
    : VideoFonts.getVideoFontIdFromStack(value);
  return id ? VIDEO_FONT_REGISTRY[id].label : value;
}
function _formatEffect({
  kind,
  value,
}: Readonly<{
  kind: TokenKind;
  value: unknown;
}>): string | undefined {
  return match(kind)
    .with("shadow", "elevation", () => {
      return (
        (value as ShadowValue).layers
          .map((layer) => {
            return `${layer.offsetX} ${layer.offsetY} ${layer.blur}`;
          })
          .join(", ") || "0"
      );
    })
    .with("glow", () => {
      const glow = value as GlowValue;
      return `${_number(glow.spread)} px ${_percent(glow.opacity)}`;
    })
    .with("textShadow", () => {
      const shadow = value as TextShadowValue;
      return `${shadow.offsetX} ${shadow.offsetY} ${shadow.blur}`;
    })
    .with("dash", () => {
      return `[${(value as readonly number[]).join(" ")}]`;
    })
    .with("sketchProfile", () => {
      return `~${_number((value as ResolvedSketchProfile).roughness)}`;
    })
    .with("spring", () => {
      const spring = value as SpringValue;
      return `${spring.damping} / ${spring.stiffness} / ${spring.mass}`;
    })
    .with(P.union(...UNHANDLED_FORMAT_EFFECT_KINDS), () => {
      return undefined;
    })
    .exhaustive();
}
function _formatStructure({
  kind,
  value,
}: Readonly<{
  kind: TokenKind;
  value: unknown;
}>): string | undefined {
  return match(kind)
    .with("typeStyle", () => {
      const style = value as ResolvedTypeStyle;
      return `${_fontLabel(style.fontId)} ${_number(style.fontSize)} px ${style.fontWeight}`;
    })
    .with("paint", () => {
      const paint = value as ResolvedPaint;
      return paint.alpha >= 1
        ? paint.color
        : `${paint.color} ${_percent(paint.alpha)}`;
    })
    .with("fill", () => {
      const fill = value as ResolvedFill;
      return fill.type === "solid" ? fill.color : `${fill.from} → ${fill.to}`;
    })
    .with("gradient", () => {
      const gradient = value as GradientValue;
      return `${gradient.from} → ${gradient.to}`;
    })
    .with("cameraPreset", () => {
      const preset = value as ResolvedCameraPreset;
      return `${_number(preset.speed)}× ${_number(preset.shutter)}°`;
    })
    .with("range", () => {
      const range = value as ResolvedRange;
      return `${_number(range.min)}…${_number(range.max)}`;
    })
    .with(P.union(...UNHANDLED_FORMAT_STRUCTURE_KINDS), () => {
      return undefined;
    })
    .exhaustive();
}
function _formatCollection({
  kind,
  value,
}: Readonly<{
  kind: TokenKind;
  value: unknown;
}>): string | undefined {
  return match(kind)
    .with("box", () => {
      return Object.entries(value as Readonly<Record<string, number>>)
        .map(([side, pixels]) => {
          return `${side} ${_number(pixels)}`;
        })
        .join(" · ");
    })
    .with("motionStep", () => {
      const step = value as ResolvedMotionStep;
      const frames = step.duration ?? step.period;
      return frames === undefined ? "" : _milliseconds(frames);
    })
    .with("colorTuple", () => {
      const shades = value as readonly string[];
      return `${shades[0]} … ${shades[shades.length - 1]}`;
    })
    .with("shade", () => {
      const shade = value as ShadeValue;
      return typeof shade === "number"
        ? String(shade)
        : `${shade.dark} / ${shade.light}`;
    })
    .with(P.union(...UNHANDLED_FORMAT_COLLECTION_KINDS), () => {
      return undefined;
    })
    .exhaustive();
}
/**
 * A short, language-neutral reading of a token value, such as `18 px`,
 * `300 ms`, or `Arial 17 px 400`. Use it wherever a control must show its
 * value as text, for example token rows and reference pickers.
 */
export function formatTokenValue(
  options: Readonly<{
    kind: TokenKind;
    value: unknown;
  }>,
): string {
  const { kind, value } = options;
  if (value === undefined || value === null) {
    return "";
  }
  return match(kind)
    .with("length", "cssLength", () => {
      const pixels = parseCssPixels(value);
      return pixels === undefined ? "" : `${_number(pixels)} px`;
    })
    .with("letterSpacing", () => {
      return `${_number(Number(value))} em`;
    })
    .with("opacity", () => {
      return _percent(Number(value));
    })
    .with("duration", () => {
      return _milliseconds(Number(value));
    })
    .with("number", "fontWeight", "cssNumber", () => {
      return _number(parseCssPixels(value) ?? 0);
    })
    .with("easing", () => {
      const easing = value as EasingValue;
      return "powerInOut" in easing
        ? `x^${easing.powerInOut}`
        : `cubic-bezier(${easing.map(_number).join(", ")})`;
    })
    .with("fontFamily", "fontStack", () => {
      return _fontLabel(String(value));
    })
    .with(P.union(...UNHANDLED_FORMAT_TOKEN_VALUE_KINDS), () => {
      return _compositeValueText({ kind, value });
    })
    .exhaustive();
}

function _compositeValueText({
  kind,
  value,
}: Readonly<{ kind: TokenKind; value: unknown }>): string {
  return (
    _formatEffect({
      kind,
      value,
    }) ??
    _formatStructure({
      kind,
      value,
    }) ??
    _formatCollection({
      kind,
      value,
    }) ??
    String(value)
  );
}
