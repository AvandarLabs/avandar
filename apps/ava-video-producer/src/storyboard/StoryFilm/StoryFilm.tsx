import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, ramp } from "../../motion";
import { getHorizontalBlurFilter } from "../../motion-components/getHorizontalBlurFilter";
import { HorizontalBlurFilter } from "../../motion-components/HorizontalBlur";
import { CaptionOverlay } from "../../scenes/CaptionOverlay";
import { captionBand } from "../../scenes/layout/layout";
import {
  absoluteCues,
  durationInFrames,
  timeline,
  type Storyboard,
} from "../schema/schema";
import { createThemeStyleFromTheme } from "./createThemeStyleFromTheme";
import { getShotTransitionLayers } from "./getShotTransitionLayers";
import { ShotView, type ProductSceneRenderer } from "./ShotView";
import type { CSSProperties, ReactNode } from "react";

export type { ProductSceneRenderer } from "./ShotView";

const OUTGOING_BLUR_ID = "story-film-outgoing-blur";

/**
 * Plays a storyboard: each shot over the previous one through its shot
 * transition (a dissolve by default, a stepped column wipe, or a hard cut),
 * with each shot's own theme tokens layered over the plan theme.
 */
export function StoryFilm({
  plan,
  productScene,
  showCaptions = true,
}: {
  plan: Storyboard;
  productScene?: ProductSceneRenderer;
  showCaptions?: boolean;
}): ReactNode {
  const frame = useCurrentFrame();
  const shots = timeline(plan);
  const index = Math.max(
    0,
    shots.findIndex((shot) => {
      return frame >= shot.startFrame && frame < shot.endFrame;
    }),
  );
  const shot = shots[index];
  const localFrame = frame - shot.startFrame;
  const previous = index > 0 ? shots[index - 1] : undefined;
  const layers = getShotTransitionLayers({
    transition: shot.transition,
    transitionInFrames: shot.transitionInFrames,
    previousDurationInFrames: previous?.durationInFrames,
    localFrame,
    width: plan.width,
  });
  const total = durationInFrames(plan);
  // Reserve a stable caption band rather than placing text over scene content.
  const sceneHeight =
    plan.height -
    (plan.captions ? captionBand(plan.narration, plan.width, plan.height) : 0);
  const loopOut =
    plan.purpose === "loop" ? 1 - ramp(frame, total - 18, 18, EASE.inOut) : 1;
  const common = { width: plan.width, height: sceneHeight, productScene };
  return (
    <AbsoluteFill
      style={{
        ...createThemeStyleFromTheme(plan.theme),
        background: "var(--ground)",
      }}
    >
      <AbsoluteFill style={{ opacity: loopOut }}>
        {previous && layers.outgoing ? (
          <>
            <HorizontalBlurFilter
              id={OUTGOING_BLUR_ID}
              amount={layers.outgoing.blurX}
            />
            <_ShotLayer
              {...common}
              shot={previous}
              frame={layers.outgoing.frame}
              style={{
                transform: `translateX(${layers.outgoing.offsetX.toFixed(2)}px)`,
                filter: getHorizontalBlurFilter(
                  OUTGOING_BLUR_ID,
                  layers.outgoing.blurX,
                ),
              }}
            />
          </>
        ) : null}
        <_ShotLayer
          {...common}
          shot={shot}
          frame={localFrame}
          style={layers.incoming}
        />
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

/** One opaque shot, painted on its own theme's ground. */
function _ShotLayer({
  shot,
  frame,
  width,
  height,
  productScene,
  style,
}: {
  shot: Storyboard["shots"][number];
  frame: number;
  width: number;
  height: number;
  productScene?: ProductSceneRenderer;
  style: CSSProperties;
}) {
  return (
    <AbsoluteFill
      style={{
        ...createThemeStyleFromTheme(shot.theme),
        background: "var(--ground)",
        ...style,
      }}
    >
      <ShotView
        shot={shot}
        frame={frame}
        width={width}
        height={height}
        productScene={productScene}
      />
    </AbsoluteFill>
  );
}
