import { getDefaultLiteralFromKind } from "./getDefaultLiteralFromKind";
import type { NumberField } from "./NumberFields/NumberFields";

const OFFSET_X = {
  key: "offsetX",
  name: "Offset x",
  min: -200,
  max: 200,
  step: 1,
};
const OFFSET_Y = {
  key: "offsetY",
  name: "Offset y",
  min: -200,
  max: 200,
  step: 1,
};
const BLUR = { key: "blur", name: "Blur", min: 0, max: 200, step: 1 };
const ALPHA = { key: "alpha", name: "Opacity", min: 0, max: 1, step: 0.01 };

/** Field names and ranges for each effect kind. */
export const EFFECT_FIELDS: Record<
  "shadow" | "glow" | "textShadow",
  NumberField[]
> = {
  shadow: [
    OFFSET_X,
    OFFSET_Y,
    BLUR,
    { key: "spread", name: "Spread", min: -100, max: 100, step: 1 },
    ALPHA,
  ],
  glow: [
    { key: "spread", name: "Spread", min: -200, max: 200, step: 1 },
    { ...BLUR, max: 100 },
    { key: "opacity", name: "Opacity", min: 0, max: 1, step: 0.01 },
  ],
  textShadow: [
    { ...OFFSET_X, min: -50, max: 50 },
    { ...OFFSET_Y, min: -50, max: 50 },
    { ...BLUR, max: 50 },
    ALPHA,
  ],
};

/**
 * The layer a new shadow layer starts from, and the fallback for a missing
 * field.
 */
export const DEFAULT_SHADOW_LAYER =
  getDefaultLiteralFromKind("shadow").layers[0];
