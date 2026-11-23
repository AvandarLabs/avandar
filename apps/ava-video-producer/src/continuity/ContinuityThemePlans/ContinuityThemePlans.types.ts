import type {
  MotionEasing,
  MotionOptions,
} from "../../motion-components/MotionSettings/MotionSettings";
import type { Storyboard } from "../../storyboard/schema/schema";
import type {
  ResolvedRange,
  ResolvedVideoTheme,
} from "../../videoTheme/videoTheme.types";
import type { ContinuityBeat } from "../continuitySchema/continuitySchema";
/** Semantic video tokens used to fit a plan. */
export type ThemeSemantic = ResolvedVideoTheme["semantic"];
/** A storyboard shot using the continuity scene grammar. */
export type ContinuityShot = Extract<
  Storyboard["shots"][number],
  {
    scene: "continuity";
  }
>;
/** One validated continuity content variant. */
export type BeatContent = ContinuityBeat["content"];
/** An authored stock-camera key. */
export type CameraKey = NonNullable<
  Extract<
    BeatContent,
    {
      kind: "stock";
    }
  >["camera"]
>[number];
/** The named camera curves supplied by the theme. */
export type CameraCurveName = "glide" | "push" | "whip";
/** Resolved camera curves, zoom bounds and preset motion. */
export type CameraTheme = {
  curves: Record<CameraCurveName, MotionEasing>;
  zoom: ResolvedRange;
  presetOptions: MotionOptions | undefined;
};
