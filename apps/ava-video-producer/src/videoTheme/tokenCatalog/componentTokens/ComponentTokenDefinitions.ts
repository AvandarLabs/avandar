import { TokenDefinitions } from "../TokenDefinitions";
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
function _makeLengthToken({
  label,
  description,
  surface = "graphic",
}: Readonly<{
  label: string;
  description: string;
  surface?: TokenSurface;
}>): LengthTokenDefinition {
  return TokenDefinitions.token({
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
function _makeOffsetToken({
  label,
  description,
  surface = "graphic",
}: Readonly<{
  label: string;
  description: string;
  surface?: TokenSurface;
}>): OffsetTokenDefinition {
  return TokenDefinitions.token({
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
function _makeStrokeToken({
  label,
  description,
  surface = "graphic",
}: Readonly<{
  label: string;
  description: string;
  surface?: TokenSurface;
}>): StrokeTokenDefinition {
  return TokenDefinitions.token({
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
function _makeAlphaToken({
  label,
  description,
  surface = "graphic",
}: Readonly<{
  label: string;
  description: string;
  surface?: TokenSurface;
}>): AlphaTokenDefinition {
  return TokenDefinitions.token({
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
function _makeColorToken({
  label,
  description,
  surface = "graphic",
}: Readonly<{
  label: string;
  description: string;
  surface?: TokenSurface;
}>): ColorTokenDefinition {
  return TokenDefinitions.token({ kind: "color", surface, label, description });
}
/** A duration token in frames, from 0 to 240. */
function _makeDurationToken({
  label,
  description,
  surface = "graphic",
}: Readonly<{
  label: string;
  description: string;
  surface?: TokenSurface;
}>): DurationTokenDefinition {
  return TokenDefinitions.token({
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
function _makeEasingToken({
  label,
  description,
  surface = "graphic",
}: Readonly<{
  label: string;
  description: string;
  surface?: TokenSurface;
}>): EasingTokenDefinition {
  return TokenDefinitions.token({
    kind: "easing",
    surface,
    label,
    description,
  });
}
/** A plain number token bounded by the given range. */
function _makeNumberToken({
  label,
  description,
  range,
}: Readonly<{
  label: string;
  description: string;
  range: Readonly<{
    min: number;
    max: number;
    step: number;
  }>;
}>): NumberTokenDefinition {
  return TokenDefinitions.token({
    kind: "number",
    surface: "graphic",
    ...range,
    label,
    description,
  });
}
/** A token that takes one of the given option strings. */
function _makeEnumToken<const Options extends readonly string[]>({
  label,
  description,
  options,
}: Readonly<{
  label: string;
  description: string;
  options: Options;
}>): EnumTokenDefinition<Options> {
  return TokenDefinitions.token({
    kind: "enum",
    surface: "graphic",
    options,
    label,
    description,
  });
}
/** A dash pattern token for a dashed stroke. */
function _makeDashToken({
  label,
  description,
}: Readonly<{
  label: string;
  description: string;
}>): DashTokenDefinition {
  return TokenDefinitions.token({
    kind: "dash",
    surface: "graphic",
    label,
    description,
  });
}
/** A hand-drawn sketch profile token. */
function _makeSketchToken({
  label,
  description,
}: Readonly<{
  label: string;
  description: string;
}>): SketchTokenDefinition {
  return TokenDefinitions.token({
    kind: "sketchProfile",
    surface: "graphic",
    label,
    description,
  });
}

/** Declares the typed component tokens used by the video theme catalog. */
export const ComponentTokenDefinitions = {
  /** A pixel length token from 0 to 400, such as a radius or a size. */
  makeLengthToken: _makeLengthToken,
  /** A signed pixel offset token from -200 to 200. */
  makeOffsetToken: _makeOffsetToken,
  /** A stroke width token in pixels, from 0 to 12. */
  makeStrokeToken: _makeStrokeToken,
  /** An opacity token from 0 to 1. */
  makeAlphaToken: _makeAlphaToken,
  /** A colour token. */
  makeColorToken: _makeColorToken,
  /** A duration token in frames, from 0 to 240. */
  makeDurationToken: _makeDurationToken,
  /** An easing curve token. */
  makeEasingToken: _makeEasingToken,
  /** A plain number token bounded by the given range. */
  makeNumberToken: _makeNumberToken,
  /** A token that takes one of the given option strings. */
  makeEnumToken: _makeEnumToken,
  /** A dash pattern token for a dashed stroke. */
  makeDashToken: _makeDashToken,
  /** A hand-drawn sketch profile token. */
  makeSketchToken: _makeSketchToken,
};
