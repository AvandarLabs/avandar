import { token } from "../defineTokensHelpers";
import type { TokenSurface } from "../../videoTheme.types";

/** The token definition `createLengthToken` declares. */
type LengthTokenDefinition = Readonly<{
  kind: "length";
  surface: TokenSurface;
  unit: "px";
  min: 0;
  max: 400;
  step: 0.5;
  label: string;
  description: string;
}>;

/** The token definition `createOffsetToken` declares. */
type OffsetTokenDefinition = Readonly<{
  kind: "length";
  surface: TokenSurface;
  unit: "px";
  min: -200;
  max: 200;
  step: 0.5;
  label: string;
  description: string;
}>;

/** The token definition `createStrokeToken` declares. */
type StrokeTokenDefinition = Readonly<{
  kind: "length";
  surface: TokenSurface;
  unit: "px";
  min: 0;
  max: 12;
  step: 0.1;
  label: string;
  description: string;
}>;

/** The token definition `createAlphaToken` declares. */
type AlphaTokenDefinition = Readonly<{
  kind: "opacity";
  surface: TokenSurface;
  unit: "%";
  min: 0;
  max: 1;
  step: 0.005;
  label: string;
  description: string;
}>;

/** The token definition `createColorToken` declares. */
type ColorTokenDefinition = Readonly<{
  kind: "color";
  surface: TokenSurface;
  label: string;
  description: string;
}>;

/** The token definition `createDurationToken` declares. */
type DurationTokenDefinition = Readonly<{
  kind: "duration";
  surface: TokenSurface;
  unit: "frames";
  min: 0;
  max: 240;
  step: 1;
  label: string;
  description: string;
}>;

/** The token definition `createEasingToken` declares. */
type EasingTokenDefinition = Readonly<{
  kind: "easing";
  surface: TokenSurface;
  label: string;
  description: string;
}>;

/** The token definition `createNumberToken` declares. */
type NumberTokenDefinition = Readonly<{
  kind: "number";
  surface: "graphic";
  min: number;
  max: number;
  step: number;
  label: string;
  description: string;
}>;

/** The token definition `createEnumToken` declares. */
type EnumTokenDefinition<Options extends readonly string[]> = Readonly<{
  kind: "enum";
  surface: "graphic";
  options: Options;
  label: string;
  description: string;
}>;

/** The token definition `createDashToken` declares. */
type DashTokenDefinition = Readonly<{
  kind: "dash";
  surface: "graphic";
  label: string;
  description: string;
}>;

/** The token definition `createSketchToken` declares. */
type SketchTokenDefinition = Readonly<{
  kind: "sketchProfile";
  surface: "graphic";
  label: string;
  description: string;
}>;

/** A pixel length token from 0 to 400, such as a radius or a size. */
export function createLengthToken(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
): LengthTokenDefinition {
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
): OffsetTokenDefinition {
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
): StrokeTokenDefinition {
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
): AlphaTokenDefinition {
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
): ColorTokenDefinition {
  return token({ kind: "color", surface, label, description });
}

/** A duration token in frames, from 0 to 240. */
export function createDurationToken(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
): DurationTokenDefinition {
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
): EasingTokenDefinition {
  return token({ kind: "easing", surface, label, description });
}

/** A plain number token bounded by the given range. */
export function createNumberToken(
  label: string,
  description: string,
  range: Readonly<{ min: number; max: number; step: number }>,
): NumberTokenDefinition {
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
): EnumTokenDefinition<Options> {
  return token({
    kind: "enum",
    surface: "graphic",
    options,
    label,
    description,
  });
}

/** A dash pattern token for a dashed stroke. */
export function createDashToken(
  label: string,
  description: string,
): DashTokenDefinition {
  return token({ kind: "dash", surface: "graphic", label, description });
}

/** A hand-drawn sketch profile token. */
export function createSketchToken(
  label: string,
  description: string,
): SketchTokenDefinition {
  return token({
    kind: "sketchProfile",
    surface: "graphic",
    label,
    description,
  });
}
