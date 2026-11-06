import { createContext, useContext } from "react";
import type { ContinuityPlan } from "./continuitySchema";

/** Editorial appearance never changes the actual product's theme. */
export type ContinuityAppearance = Pick<
  ContinuityPlan,
  | "background"
  | "accent"
  | "cameraMotion"
  | "motionBlur"
  | "annotations"
  | "annotationRoughness"
  | "boxRoughness"
>;

/** Shared appearance for camera, notation and editorial layers. */
export const ContinuityAppearanceContext = createContext<ContinuityAppearance>({
  background: "#0b1219",
  accent: "#9fefca",
  cameraMotion: true,
  motionBlur: true,
  annotations: true,
  annotationRoughness: 1.5,
  boxRoughness: 0,
});

/** Read the current film's live/export appearance snapshot. */
export function useContinuityAppearance() {
  return useContext(ContinuityAppearanceContext);
}

/** Keep editorial headings legible on the selectable stage surfaces. */
export function getEditorialInk(background: string): string {
  const rgb = [1, 3, 5].map((offset) =>
    parseInt(background.slice(offset, offset + 2), 16),
  );
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 145
    ? "#182d27"
    : "#edf7f4";
}
