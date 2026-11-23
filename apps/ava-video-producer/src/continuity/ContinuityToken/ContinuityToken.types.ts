import type { ContinuityPlan } from "../continuitySchema/continuitySchema";
import type { CSSProperties } from "react";
/** The shared object's active beat, anchors and frame-sampled presentation. */
export type SampledContinuityToken = {
  beat: ContinuityPlan["beats"][number];
  token: NonNullable<ContinuityPlan["beats"][number]["token"]>;
  source: NonNullable<ContinuityPlan["beats"][number]["token"]>["anchor"];
  destination: NonNullable<ContinuityPlan["beats"][number]["token"]>["anchor"];
  at: number;
  progress: number;
  style: CSSProperties;
};
