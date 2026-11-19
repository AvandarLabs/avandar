import {
  getMotionProgress,
  useMotionSettingsTheme,
} from "../motion-components/motionSettings";
import { SharedElement } from "../motion-components/SharedElement";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoProps, useVideoTokens } from "../videoTheme/useVideoTheme";
import { ContinuityBoxOutline } from "./ContinuityBoxOutline";
import css from "./ContinuityScene.module.css";
import { getContinuityTimeline } from "./continuityTimeline";
import type { ContinuityPlan } from "./continuitySchema";
import type { ReactNode } from "react";

/** Frame the shared object starts fading in. */
const FADE_IN_AT = 12;
/** Frames into its beat an outline token starts fading. */
const OUTLINE_FADE_AFTER = 60;

/**
 * A single persistent object carries identity across a scene boundary, on
 * the shared object corner and its fades.
 */
export function ContinuityToken({
  plan,
  frame,
}: {
  plan: ContinuityPlan;
  frame: number;
}): ReactNode {
  const tokens = useVideoTokens();
  const sharedObject = useVideoProps("SharedObject", {});
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const settings = useMotionSettingsTheme();
  const fade = motion.reveal.easing;
  const isSketched = tokens.sketch.box.roughness > 0;
  const timing = getContinuityTimeline(plan.beats);
  const index = Math.max(
    0,
    timing.reduce((found, entry, position) => {
      return frame >= entry.start ? position : found;
    }, 0),
  );
  const beat = plan.beats[index];
  if (!beat.token) return null;
  const previous = plan.beats[index - 1]?.token;
  const progress = getMotionProgress(
    frame,
    timing[index].start,
    Math.max(1, beat.transition.frames),
    beat.transition.motion,
    undefined,
    settings,
  );
  const destination = beat.token.anchor;
  const source =
    previous?.label === beat.token.label ? previous.anchor : destination;
  return (
    <SharedElement
      source={source}
      target={destination}
      frame={frame}
      at={timing[index].start}
      durationInFrames={Math.max(1, beat.transition.frames)}
      motion={beat.transition.motion}
      className={css.continuityToken}
      style={{
        borderColor: isSketched ? "transparent" : undefined,
        borderRadius: isSketched ? 0 : scales.corner(tokens.corner.sharedObject),
        background:
          beat.token.appearance === "outline" ? "transparent" : undefined,
        opacity:
          motion.ramp(
            frame,
            FADE_IN_AT,
            motion.scale(sharedObject.fadeIn),
            fade,
          ) *
          (beat.token.appearance === "outline"
            ? 1 -
              motion.ramp(
                frame,
                timing[index].start + OUTLINE_FADE_AFTER,
                motion.scale(sharedObject.outlineFade),
                fade,
              )
            : 1),
      }}
    >
      <ContinuityBoxOutline />
      <span
        style={{
          opacity: beat.token.appearance === "outline" ? 1 - progress : 1,
        }}
      >
        {beat.token.label}
      </span>
    </SharedElement>
  );
}
