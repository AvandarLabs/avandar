import { CaptionLayout } from "../../../scenes/layout/CaptionLayout";
import { type Storyboard } from "../../schema/schema";
import { StoryboardTimeline } from "../../schema/StoryboardTimeline";
import { getShotTransitionLayers } from "../getShotTransitionLayers/getShotTransitionLayers";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";

const OUTGOING_BLUR_ID = "story-film-outgoing-blur";
/** The shot playing at `frame`, and the one before it, if any. */
function _findShotsAtFrame({
  plan,
  frame,
}: Readonly<{
  plan: Storyboard;
  frame: number;
}>) {
  const shots = StoryboardTimeline.timeline(plan);
  const index = Math.max(
    0,
    shots.findIndex((shot) => {
      return frame >= shot.startFrame && frame < shot.endFrame;
    }),
  );
  return {
    shot: shots[index],
    previous: index > 0 ? shots[index - 1] : undefined,
  };
}
/**
 * The shot playing at `frame`, the one before it, the shot's own frame, and
 * the transition layers between them.
 */
function _getShotLayersAtFrame({
  plan,
  frame,
  motion,
}: Readonly<{
  plan: Storyboard;
  frame: number;
  motion: VideoMotion;
}>) {
  const { shot, previous } = _findShotsAtFrame({ plan, frame });
  const localFrame = frame - shot.startFrame;
  const layers = getShotTransitionLayers({
    transition: shot.transition,
    transitionInFrames: shot.transitionInFrames,
    previousDurationInFrames: previous?.durationInFrames,
    localFrame,
    width: plan.width,
    motion,
  });
  return { shot, previous, localFrame, layers };
}
/**
 * A loop film's fade back to its ground over its last loop-fade frames. Other
 * films stay opaque.
 */
function _getLoopOutOpacity({
  plan,
  frame,
  motion,
}: Readonly<{
  plan: Storyboard;
  frame: number;
  motion: VideoMotion;
}>): number {
  if (plan.purpose !== "loop") {
    return 1;
  }
  const total = StoryboardTimeline.durationInFrames(plan);
  const loopFade = motion.loopFade.film;
  return (
    1 - motion.ramp(frame, total - loopFade, loopFade, motion.dissolve.easing)
  );
}
/** Selects shot layers, reserves caption space, and fades looping films out. */
export const StoryFilmShared = {
  /**
   * The shot playing at `frame`, the one before it, the shot's own frame,
   * and the transition layers between them.
   */
  getShotLayersAtFrame: _getShotLayersAtFrame,
  /** The shot playing at `frame`, and the one before it, if any. */
  findShotsAtFrame: _findShotsAtFrame,
  /**
   * A loop film's fade back to its ground over its last loop-fade frames.
   * Other films stay opaque.
   */
  getLoopOutOpacity: _getLoopOutOpacity,
  /**
   * The height left for shots. A stable caption band is reserved rather
   * than placing text over scene content.
   */
  getSceneHeight: (plan: Storyboard): number => {
    return (
      plan.height -
      (plan.captions
        ? CaptionLayout.captionBand({
            cues: plan.narration,
            width: plan.width,
            height: plan.height,
          })
        : 0)
    );
  },
  /** SVG filter id shared by the outgoing shot and its horizontal blur. */
  OUTGOING_BLUR_ID,
} as const;
