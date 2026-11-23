import type { useVideoMotion } from "../../videoTheme/useVideoMotion";
import type { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import type { ResolvedVideoComponents } from "../../videoTheme/videoTheme.types";
import type { useVideoTokens } from "../../videoTheme/videoThemeHelpers";
import type { ContinuityBeat } from "../continuitySchema/continuitySchema";
import type { CSSProperties } from "react";

type Options = {
  frame: number;
  at: number;
  appearance: NonNullable<ContinuityBeat["token"]>["appearance"];
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  tokens: ReturnType<typeof useVideoTokens>;
  sharedObject: ResolvedVideoComponents["SharedObject"];
};
/** Frame the shared object starts fading in. */
const FADE_IN_AT = 12;
/** Frames into its beat an outline token starts fading. */
const OUTLINE_FADE_AFTER = 60;
/** Compute the shared token's themed corners, fill and frame-driven opacity. */
export function getContinuityTokenStyle({
  frame,
  at,
  appearance,
  motion,
  scales,
  tokens,
  sharedObject,
}: Readonly<Options>): CSSProperties {
  const fade = motion.reveal.easing;
  const isSketched = tokens.sketch.box.roughness > 0;
  return {
    borderColor: isSketched ? "transparent" : undefined,
    borderRadius: isSketched ? 0 : scales.corner(tokens.corner.sharedObject),
    background: appearance === "outline" ? "transparent" : undefined,
    opacity:
      motion.ramp(frame, FADE_IN_AT, motion.scale(sharedObject.fadeIn), fade) *
      (appearance === "outline"
        ? 1 -
          motion.ramp(
            frame,
            at + OUTLINE_FADE_AFTER,
            motion.scale(sharedObject.outlineFade),
            fade,
          )
        : 1),
  };
}
