import { createContext } from "react";
import type { ContinuityPlan } from "../continuitySchema/continuitySchema";

/**
 * The render switches a continuity film was played with: camera travel,
 * motion blur, and annotations. Colours and sketch come from the video
 * theme instead.
 */
export type ContinuityAppearance = Pick<
  ContinuityPlan,
  "cameraMotion" | "motionBlur" | "annotations"
>;

/** Shared render switches for camera, notation and editorial layers. */
export const ContinuityAppearanceContext = createContext<ContinuityAppearance>({
  cameraMotion: true,
  motionBlur: true,
  annotations: true,
});
