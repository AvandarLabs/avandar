import { mix } from "../../motion";
import { getClassicStageMotion } from "../../scenes/stageTheme/stageTheme";
import { getSteppedColumnWipeStyle } from "./steppedColumnWipe";
import type { VideoMotion } from "../../videoTheme/createVideoMotion/createVideoMotion";
import type { ShotTransition } from "../schema/shotTransitionSchema";
import type { CSSProperties } from "react";

/** How `StoryFilm` draws the outgoing shot during a transition. */
export type OutgoingShotLayer = {
  /** The outgoing shot's own frame to render. */
  frame: number;
  /** Horizontal travel of the whole outgoing layer, in canvas pixels. */
  offsetX: number;
  /** Horizontal-only blur on the outgoing layer, in pixels. */
  blurX: number;
};

type Options = {
  transition?: ShotTransition;
  transitionInFrames: number;
  /** Undefined for the first shot, which has nothing to transition from. */
  previousDurationInFrames?: number;
  /** The incoming shot's local frame. */
  localFrame: number;
  width: number;
  /** The theme's motion. Defaults to `classic`. */
  motion?: VideoMotion;
};

type ShotTransitionLayers = {
  outgoing?: OutgoingShotLayer;
  incoming: CSSProperties;
};

/** The original dissolve: the incoming shot fades in over the outgoing one. */
function _createDissolveLayers(
  frame: number,
  localFrame: number,
  transitionInFrames: number,
  motion: VideoMotion,
): ShotTransitionLayers {
  return {
    outgoing: { frame, offsetX: 0, blurX: 0 },
    incoming: {
      opacity: motion.ramp(
        localFrame,
        0,
        transitionInFrames,
        motion.dissolve.easing,
      ),
    },
  };
}

/** Columns cover the outgoing shot while it drifts and blurs away. */
function _createSteppedWipeLayers(
  frame: number,
  options: Readonly<{
    transition: Extract<ShotTransition, { kind: "stepped-column-wipe" }>;
    localFrame: number;
    transitionInFrames: number;
    width: number;
    motion: VideoMotion;
  }>,
): ShotTransitionLayers {
  const { transition, localFrame, transitionInFrames, width, motion } = options;
  // The outgoing layer accelerates away while the columns cover it.
  const drift = motion.ramp(
    localFrame,
    0,
    transitionInFrames,
    motion.depart.easing,
  );
  return {
    outgoing: {
      frame,
      offsetX: mix(drift, 0, (transition.outgoingDrift?.x ?? 0) * width),
      blurX: mix(drift, 0, transition.outgoingDrift?.blur ?? 0),
    },
    incoming: getSteppedColumnWipeStyle(
      localFrame,
      transitionInFrames,
      transition,
      motion,
    ),
  };
}

/**
 * The two layers `StoryFilm` stacks at one frame of a shot boundary: the
 * outgoing shot (absent outside a transition) and the style of the incoming
 * shot above it. A missing transition kind is the original dissolve, so
 * existing plans keep their look. A declared `cut` never draws the outgoing
 * shot.
 */
export function getShotTransitionLayers({
  transition,
  transitionInFrames,
  previousDurationInFrames,
  localFrame,
  width,
  motion = getClassicStageMotion(),
}: Options): ShotTransitionLayers {
  if (
    previousDurationInFrames === undefined ||
    transition?.kind === "cut" ||
    transitionInFrames === 0 ||
    localFrame >= transitionInFrames
  ) {
    return { incoming: {} };
  }
  const frame =
    transition?.outgoing === "playing"
      ? previousDurationInFrames + localFrame
      : previousDurationInFrames - 1;
  return transition?.kind === "stepped-column-wipe"
    ? _createSteppedWipeLayers(frame, {
        transition,
        localFrame,
        transitionInFrames,
        width,
        motion,
      })
    : _createDissolveLayers(frame, localFrame, transitionInFrames, motion);
}
