import { match } from "ts-pattern";
import { resolveMotionSettings } from "./motionSettings";
import type { MotionRect } from "./getOverlayTimings";
import type { MotionOptions } from "./motionSettings";
import type { CSSProperties } from "react";

/**
 * Every reveal and continuity treatment a scene transition supports. Schemas
 * validate a transition's `kind` against this list.
 */
export const SCENE_TRANSITION_KINDS = [
  "cut",
  "dissolve",
  "wipe",
  "aperture",
  "spatial",
  "handoff",
  "morph",
] as const;

/** Reveal and continuity treatments available to any TransitionSeries. */
export type SceneTransitionKind = (typeof SCENE_TRANSITION_KINDS)[number];

/** Native stage geometry and motion controls for a scene boundary. */
export type SceneTransitionProps = {
  kind: SceneTransitionKind;
  anchor?: MotionRect;
  origin?: { x: number; y: number };
  width?: number;
  height?: number;
  cameraMotion?: boolean;
  motionBlur?: boolean;
  motion?: MotionOptions;
  /** Corner radius a morph starts from, in stage pixels. 12 when unthemed. */
  morphRadius?: number;
  /**
   * How far past the frame's diagonal an aperture opens. 1.05 when unthemed.
   */
  apertureOverscan?: number;
};

/**
 * The CSS style for the entering or exiting scene at `progress` (0 to 1)
 * through a scene transition. The style depends only on `progress`, never on
 * playback history, so it is safe to seek. Each scene keeps one native UI
 * instance, and only its clip, opacity, transform and filter change.
 */
export function getSceneTransitionStyle(
  progress: number,
  entering: boolean,
  props: SceneTransitionProps,
): CSSProperties {
  const {
    width = 1600,
    height = 840,
    cameraMotion = true,
    motionBlur = true,
    morphRadius = 12,
    apertureOverscan = 1.05,
  } = props;
  const kind = cameraMotion ? props.kind : "dissolve";
  const origin = props.origin ?? { x: width / 2, y: height / 2 };
  const anchor = props.anchor ?? {
    x: width * 0.36,
    y: height * 0.47619,
    width: width * 0.15,
    height: height / 14,
  };
  const settings = resolveMotionSettings(props.motion);
  const clipPath = !entering
    ? undefined
    : match(kind)
        .with("aperture", () => {
          return `circle(${progress * Math.hypot(width, height) * apertureOverscan}px at ${origin.x}px ${origin.y}px)`;
        })
        .with("morph", () => {
          return `inset(${(1 - progress) * anchor.y}px ${(1 - progress) * (width - anchor.x - anchor.width)}px ${(1 - progress) * (height - anchor.y - anchor.height)}px ${(1 - progress) * anchor.x}px round ${morphRadius * (1 - progress)}px)`;
        })
        .with("wipe", "handoff", () => {
          return `inset(0 ${(1 - progress) * 100}% 0 0)`;
        })
        .with("cut", "dissolve", "spatial", () => {
          return undefined;
        })
        .exhaustive();
  return {
    clipPath,
    opacity: kind === "dissolve" && entering ? progress : 1,
    transform:
      kind === "spatial"
        ? `translateX(${(entering ? 1 - progress : -progress) * width}px)`
        : undefined,
    filter:
      kind === "spatial" && motionBlur
        ? `blur(${(Math.sin(progress * Math.PI) * settings.transitionBlur * settings.blurStrength * settings.shutterAngle) / 180}px)`
        : undefined,
  };
}
