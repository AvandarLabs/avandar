import type { NormalizedRect } from "../scenes.types";

export type Rect = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };

export function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

export function assertFrame(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0)
    throw new Error(`${name} must be a nonnegative integer`);
}

export function assertUnit(value: number, name: string): void {
  assertFinite(value, name);
  if (value < 0 || value > 1)
    throw new Error(`${name} must be between 0 and 1`);
}

export function assertRect(rect: NormalizedRect, name: string): void {
  (["x", "y", "width", "height"] as const).forEach((key) =>
    assertUnit(rect[key], `${name}.${key}`),
  );
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

export function sceneBounds(
  width = 1600,
  height = 1000,
  hasHeading = false,
): Rect {
  assertFinite(width, "width");
  assertFinite(height, "height");
  if (width < 960 || height < 640)
    throw new Error("Scenes require at least a 960 × 640 canvas");
  const margin = Math.round(width * 0.06);
  const top = hasHeading ? 214 : 90;
  return {
    x: margin,
    y: top,
    width: width - margin * 2,
    height: height - top - 104,
  };
}
