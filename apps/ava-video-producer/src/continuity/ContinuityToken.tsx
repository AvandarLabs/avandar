import { ramp } from "../motion";
import { getMotionProgress } from "../motion-components/motionSettings";
import { SharedElement } from "../motion-components/SharedElement";
import { useVideoMotion } from "../videoTheme/useVideoMotion/useVideoMotion";
import {
  useVideoProps,
  useVideoTokens,
} from "../videoTheme/useVideoTheme/useVideoTheme";
import { ContinuityBoxOutline } from "./ContinuityBoxOutline";
import css from "./ContinuityScene.module.css";
import { getContinuityTimeline } from "./continuityTimeline";
import { useContinuityCopy } from "./useContinuityCopy";
import type { ContinuityPlan } from "./continuitySchema";

/** A single persistent object carries identity across a scene boundary. */
export function ContinuityToken({
  plan,
  frame,
}: {
  plan: ContinuityPlan;
  frame: number;
}) {
  const translate = useContinuityCopy();
  const tokens = useVideoTokens();
  const sharedObject = useVideoProps("SharedObject", {});
  const motion = useVideoMotion();
  const isSketched = tokens.sketch.box.roughness > 0;
  const timing = getContinuityTimeline(plan.beats);
  const index = Math.max(
    0,
    timing.reduce(
      (found, entry, position) => (frame >= entry.start ? position : found),
      0,
    ),
  );
  const beat = plan.beats[index];
  if (!beat.token) return null;
  const previous = plan.beats[index - 1]?.token;
  const progress = getMotionProgress(
    frame,
    timing[index].start,
    Math.max(1, beat.transition.frames),
    beat.transition.motion,
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
        borderRadius: isSketched ? 0 : undefined,
        background:
          beat.token.appearance === "outline" ? "transparent" : undefined,
        opacity:
          ramp(frame, 12, motion.scale(sharedObject.fadeIn)) *
          (beat.token.appearance === "outline"
            ? 1 -
              ramp(
                frame,
                timing[index].start + 60,
                motion.scale(sharedObject.outlineFade),
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
        {translate(beat.token.label)}
      </span>
    </SharedElement>
  );
}
