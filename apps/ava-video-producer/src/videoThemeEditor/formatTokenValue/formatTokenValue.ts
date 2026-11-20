import { parseCssPixels } from "../../videoTheme/parseCssPixels/parseCssPixels";
import {
  getVideoFontIdFromStack,
  VIDEO_FONT_REGISTRY,
  type VideoFontId,
} from "../../videoTheme/videoFontRegistry/videoFontRegistryHelpers";
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
    : getVideoFontIdFromStack(value);
  return id ? VIDEO_FONT_REGISTRY[id].label : value;
}

function _formatEffect(kind: TokenKind, value: unknown): string | undefined {
  switch (kind) {
    case "shadow":
    case "elevation":
      return (
        (value as ShadowValue).layers
          .map((layer) => {
            return `${layer.offsetX} ${layer.offsetY} ${layer.blur}`;
          })
          .join(", ") || "0"
      );
    case "glow": {
      const glow = value as GlowValue;
      return `${_number(glow.spread)} px ${_percent(glow.opacity)}`;
    }
    case "textShadow": {
      const shadow = value as TextShadowValue;
      return `${shadow.offsetX} ${shadow.offsetY} ${shadow.blur}`;
    }
    case "dash":
      return `[${(value as readonly number[]).join(" ")}]`;
    case "sketchProfile":
      return `~${_number((value as ResolvedSketchProfile).roughness)}`;
    case "spring": {
      const spring = value as SpringValue;
      return `${spring.damping} / ${spring.stiffness} / ${spring.mass}`;
    }
    default:
      return undefined;
  }
}

function _formatStructure(kind: TokenKind, value: unknown): string | undefined {
  switch (kind) {
    case "typeStyle": {
      const style = value as ResolvedTypeStyle;
      return `${_fontLabel(style.fontId)} ${_number(style.fontSize)} px ${style.fontWeight}`;
    }
    case "paint": {
      const paint = value as ResolvedPaint;
      return paint.alpha >= 1
        ? paint.color
        : `${paint.color} ${_percent(paint.alpha)}`;
    }
    case "fill": {
      const fill = value as ResolvedFill;
      return fill.type === "solid" ? fill.color : `${fill.from} → ${fill.to}`;
    }
    case "gradient": {
      const gradient = value as GradientValue;
      return `${gradient.from} → ${gradient.to}`;
    }
    case "cameraPreset": {
      const preset = value as ResolvedCameraPreset;
      return `${_number(preset.speed)}× ${_number(preset.shutter)}°`;
    }
    case "range": {
      const range = value as ResolvedRange;
      return `${_number(range.min)}…${_number(range.max)}`;
    }
    default:
      return undefined;
  }
}

function _formatCollection(
  kind: TokenKind,
  value: unknown,
): string | undefined {
  switch (kind) {
    case "box":
      return Object.entries(value as Readonly<Record<string, number>>)
        .map(([side, pixels]) => {
          return `${side} ${_number(pixels)}`;
        })
        .join(" · ");
    case "motionStep": {
      const step = value as ResolvedMotionStep;
      const frames = step.duration ?? step.period;
      return frames === undefined ? "" : _milliseconds(frames);
    }
    case "colorTuple": {
      const shades = value as readonly string[];
      return `${shades[0]} … ${shades[shades.length - 1]}`;
    }
    case "shade": {
      const shade = value as ShadeValue;
      return typeof shade === "number"
        ? String(shade)
        : `${shade.dark} / ${shade.light}`;
    }
    default:
      return undefined;
  }
}

/**
 * A short, language-neutral reading of a token value, such as `18 px`,
 * `300 ms`, or `Arial 17 px 400`. Use it wherever a control must show its
 * value as text, for example token rows and reference pickers.
 */
export function formatTokenValue(
  options: Readonly<{ kind: TokenKind; value: unknown }>,
): string {
  const { kind, value } = options;
  if (value === undefined || value === null) {
    return "";
  }
  switch (kind) {
    case "length":
    case "cssLength": {
      const pixels = parseCssPixels(value);
      return pixels === undefined ? "" : `${_number(pixels)} px`;
    }
    case "letterSpacing":
      return `${_number(Number(value))} em`;
    case "opacity":
      return _percent(Number(value));
    case "duration":
      return _milliseconds(Number(value));
    case "number":
    case "fontWeight":
    case "cssNumber":
      return _number(parseCssPixels(value) ?? 0);
    case "easing": {
      const easing = value as EasingValue;
      return "powerInOut" in easing
        ? `x^${easing.powerInOut}`
        : `cubic-bezier(${easing.map(_number).join(", ")})`;
    }
    case "fontFamily":
    case "fontStack":
      return _fontLabel(String(value));
    default:
      return (
        _formatEffect(kind, value) ??
        _formatStructure(kind, value) ??
        _formatCollection(kind, value) ??
        String(value)
      );
  }
}
