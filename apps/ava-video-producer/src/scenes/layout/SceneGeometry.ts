import type { NormalizedRect } from "../scenes.types";

/** A rectangle in scene canvas pixels. */
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
/** A point in the graphic canvas coordinate system. */
export type Point = {
  x: number;
  y: number;
};
/** Rejects a nonfinite layout value with its diagnostic field name. */
function _assertFinite({
  value,
  name,
}: Readonly<{
  value: number;
  name: string;
}>): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
}
/** Rejects a negative or noninteger frame with its field name. */
function _assertFrame({
  value,
  name,
}: Readonly<{
  value: number;
  name: string;
}>): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a nonnegative integer`);
  }
}
/** Rejects a nonfinite value or one outside the normalized unit interval. */
function _assertUnit({
  value,
  name,
}: Readonly<{
  value: number;
  name: string;
}>): void {
  _assertFinite({
    value,
    name,
  });
  if (value < 0 || value > 1) {
    throw new Error(`${name} must be between 0 and 1`);
  }
}
/** Rejects an empty or out-of-bounds normalized media rectangle. */
function _assertRect({
  rect,
  name,
}: Readonly<{
  rect: NormalizedRect;
  name: string;
}>): void {
  (["x", "y", "width", "height"] as const).forEach((key) => {
    return _assertUnit({
      value: rect[key],
      name: `${name}.${key}`,
    });
  });
  if (
    !rect.width ||
    !rect.height ||
    rect.x + rect.width > 1.000001 ||
    rect.y + rect.height > 1.000001
  ) {
    throw new Error(
      `${name} must be a nonempty rectangle inside the media viewport`,
    );
  }
}
/** Returns the scene content rectangle with room for headings and captions. */
function _sceneBounds({
  width = 1600,
  height = 1000,
  hasHeading = false,
}: Readonly<{
  width?: number;
  height?: number;
  hasHeading?: boolean;
}> = {}): Rect {
  _assertFinite({
    value: width,
    name: "width",
  });
  _assertFinite({
    value: height,
    name: "height",
  });
  if (width < 960 || height < 640) {
    throw new Error("Scenes require at least a 960 × 640 canvas");
  }
  const margin = Math.round(width * 0.06);
  const top = hasHeading ? 214 : 90;
  return {
    x: margin,
    y: top,
    width: width - margin * 2,
    height: height - top - 104,
  };
}

/** Validates authored scene geometry and derives safe canvas bounds. */
export const SceneGeometry = {
  /** Rejects a nonfinite layout value with its diagnostic field name. */
  assertFinite: _assertFinite,
  /** Rejects a negative or noninteger frame with its field name. */
  assertFrame: _assertFrame,
  /** Rejects a nonfinite value or one outside the normalized unit interval. */
  assertUnit: _assertUnit,
  /** Rejects an empty or out-of-bounds normalized media rectangle. */
  assertRect: _assertRect,
  /**
   * Returns the scene content rectangle with room for headings and captions.
   */
  sceneBounds: _sceneBounds,
};
