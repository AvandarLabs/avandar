import { token } from "../defineTokensHelpers";
import type { TokenSurface } from "../../videoTheme.types";

/** A pixel length token from 0 to 400, such as a radius or a size. */
export function createLengthToken(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({
    kind: "length",
    surface,
    unit: "px",
    min: 0,
    max: 400,
    step: 0.5,
    label,
    description,
  });
}

/** A signed pixel offset token from -200 to 200. */
export function createOffsetToken(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({
    kind: "length",
    surface,
    unit: "px",
    min: -200,
    max: 200,
    step: 0.5,
    label,
    description,
  });
}

/** A stroke width token in pixels, from 0 to 12. */
export function createStrokeToken(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({
    kind: "length",
    surface,
    unit: "px",
    min: 0,
    max: 12,
    step: 0.1,
    label,
    description,
  });
}

/** An opacity token from 0 to 1. */
export function createAlphaToken(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({
    kind: "opacity",
    surface,
    unit: "%",
    min: 0,
    max: 1,
    step: 0.005,
    label,
    description,
  });
}

/** A colour token. */
export function createColorToken(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({ kind: "color", surface, label, description });
}

/** A duration token in frames, from 0 to 240. */
export function createDurationToken(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({
    kind: "duration",
    surface,
    unit: "frames",
    min: 0,
    max: 240,
    step: 1,
    label,
    description,
  });
}

/** An easing curve token. */
export function createEasingToken(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({ kind: "easing", surface, label, description });
}

/** A plain number token bounded by the given range. */
export function createNumberToken(
  label: string,
  description: string,
  range: Readonly<{ min: number; max: number; step: number }>,
) {
  return token({
    kind: "number",
    surface: "graphic",
    ...range,
    label,
    description,
  });
}

/** A token that takes one of the given option strings. */
export function createEnumToken<const Options extends readonly string[]>(
  label: string,
  description: string,
  options: Options,
) {
  return token({
    kind: "enum",
    surface: "graphic",
    options,
    label,
    description,
  });
}

/** A dash pattern token for a dashed stroke. */
export function createDashToken(label: string, description: string) {
  return token({ kind: "dash", surface: "graphic", label, description });
}

/** A hand-drawn sketch profile token. */
export function createSketchToken(label: string, description: string) {
  return token({
    kind: "sketchProfile",
    surface: "graphic",
    label,
    description,
  });
}
