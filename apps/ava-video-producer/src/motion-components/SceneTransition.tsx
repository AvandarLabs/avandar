import { linearTiming } from "@remotion/transitions";
import { AbsoluteFill } from "remotion";
import {
  getMotionDuration,
  getMotionEasing,
  resolveMotionSettings,
} from "./motionSettings";
import type { MotionRect } from "./AnchoredOverlay";
import type { MotionOptions } from "./motionSettings";
import type { TransitionPresentationComponentProps } from "@remotion/transitions";
import type { CSSProperties } from "react";

/** Reveal and continuity treatments available to any TransitionSeries. */
export type SceneTransitionKind =
  | "cut"
  | "dissolve"
  | "wipe"
  | "aperture"
  | "spatial"
  | "handoff"
  | "morph";
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
};

/** Scene geometry is independent of playback history and uses one native UI instance per scene. */
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
    : kind === "aperture"
      ? `circle(${progress * Math.hypot(width, height) * 1.05}px at ${origin.x}px ${origin.y}px)`
      : kind === "morph"
        ? `inset(${(1 - progress) * anchor.y}px ${(1 - progress) * (width - anchor.x - anchor.width)}px ${(1 - progress) * (height - anchor.y - anchor.height)}px ${(1 - progress) * anchor.x}px round ${12 * (1 - progress)}px)`
        : kind === "wipe" || kind === "handoff"
          ? `inset(0 ${(1 - progress) * 100}% 0 0)`
          : undefined;
  return {
    clipPath,
    opacity: kind === "dissolve" && entering ? progress : 1,
    transform:
      kind === "spatial"
        ? `translateX(${(entering ? 1 - progress : -progress) * width}px)`
        : undefined,
    filter:
      kind === "spatial" && motionBlur
        ? `blur(${(Math.sin(progress * Math.PI) * 12 * settings.blurStrength * settings.shutterAngle) / 180}px)`
        : undefined,
  };
}

/** Remotion presentation. CSS blur keeps stateful product children single-instance. */
export function SceneTransition({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}: TransitionPresentationComponentProps<SceneTransitionProps>) {
  return (
    <AbsoluteFill
      style={getSceneTransitionStyle(
        presentationProgress,
        presentationDirection === "entering",
        passedProps,
      )}
    >
      {children}
    </AbsoluteFill>
  );
}

/** Matching timing and presentation for TransitionSeries. Cuts need no Transition element. */
export function createSceneTransition({
  durationInFrames,
  ...props
}: SceneTransitionProps & { durationInFrames: number }) {
  const duration = getMotionDuration(durationInFrames, props.motion);
  if (duration < 1 || props.kind === "cut")
    throw new Error("Cuts use adjacent sequences without a Transition element");
  return {
    timing: linearTiming({
      durationInFrames: duration,
      easing: getMotionEasing(props.motion),
    }),
    presentation: { component: SceneTransition, props },
  };
}
