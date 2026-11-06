import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, ramp } from "../../motion";
import { CaptionOverlay } from "../../scenes/CaptionOverlay";
import { captionBand } from "../../scenes/layout/layout";
import {
  absoluteCues,
  durationInFrames,
  timeline,
  type Storyboard,
} from "../schema/schema";
import { ShotView, type ProductSceneRenderer } from "./ShotView";
import type { CSSProperties } from "react";

export type { ProductSceneRenderer } from "./ShotView";

/** Incoming opaque shots dissolve over a frozen outgoing shot, avoiding a ground dip. */
export function StoryFilm({
  plan,
  productScene,
  showCaptions = true,
}: {
  plan: Storyboard;
  productScene?: ProductSceneRenderer;
  showCaptions?: boolean;
}) {
  const frame = useCurrentFrame();
  const shots = timeline(plan);
  const index = Math.max(
    0,
    shots.findIndex(
      (shot) => frame >= shot.startFrame && frame < shot.endFrame,
    ),
  );
  const shot = shots[index];
  const localFrame = frame - shot.startFrame;
  const previous = index > 0 ? shots[index - 1] : undefined;
  const incoming =
    index === 0 || shot.transitionInFrames === 0
      ? 1
      : ramp(localFrame, 0, shot.transitionInFrames, EASE.inOut);
  const total = durationInFrames(plan);
  // Reserve a stable caption band rather than placing text over scene content.
  const sceneHeight =
    plan.height -
    (plan.captions ? captionBand(plan.narration, plan.width, plan.height) : 0);
  const loopOut =
    plan.purpose === "loop" ? 1 - ramp(frame, total - 18, 18, EASE.inOut) : 1;
  const theme = Object.fromEntries(
    Object.entries(plan.theme ?? {}).map(([key, value]) => [`--${key}`, value]),
  ) as CSSProperties;
  return (
    <AbsoluteFill style={{ ...theme, background: "var(--ground)" }}>
      <AbsoluteFill style={{ opacity: loopOut }}>
        {previous && incoming < 1 ? (
          <AbsoluteFill style={{ background: "var(--ground)" }}>
            <ShotView
              shot={previous}
              frame={previous.durationInFrames - 1}
              width={plan.width}
              height={sceneHeight}
              productScene={productScene}
            />
          </AbsoluteFill>
        ) : null}
        <AbsoluteFill
          style={{ background: "var(--ground)", opacity: incoming }}
        >
          <ShotView
            shot={shot}
            frame={localFrame}
            width={plan.width}
            height={sceneHeight}
            productScene={productScene}
          />
        </AbsoluteFill>
        {plan.captions && showCaptions ? (
          <CaptionOverlay
            frame={frame}
            cues={absoluteCues(plan)}
            width={plan.width}
            height={plan.height}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
