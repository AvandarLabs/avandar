import { linearTiming } from "@remotion/transitions";
import { AbsoluteFill } from "remotion";
import {
  getClassicMotionSettingsTheme,
  getMotionDuration,
  getMotionEasing,
  resolveMotionSettings,
  useMotionSettingsTheme,
} from "./motionSettings";
import type { MotionRect } from "./AnchoredOverlay";
import type { MotionOptions, MotionSettingsTheme } from "./motionSettings";
import type {
  TransitionPresentationComponentProps,
  TransitionTiming,
} from "@remotion/transitions";
import type { CSSProperties, ReactNode } from "react";

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
  /** Corner radius a morph starts from, in stage pixels. 12 when unthemed. */
  morphRadius?: number;
  /**
   * How far past the frame's diagonal an aperture opens. 1.05 when unthemed.
   */
  apertureOverscan?: number;
};

/**
 * Scene geometry is independent of playback history and uses one native UI
 * instance per scene.
 */
export function getSceneTransitionStyle(
  progress: number,
  entering: boolean,
  props: SceneTransitionProps,
  theme: MotionSettingsTheme = getClassicMotionSettingsTheme(),
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
  const settings = resolveMotionSettings(props.motion, theme);
  const clipPath = !entering
    ? undefined
    : kind === "aperture"
      ? `circle(${progress * Math.hypot(width, height) * apertureOverscan}px at ${origin.x}px ${origin.y}px)`
      : kind === "morph"
        ? `inset(${(1 - progress) * anchor.y}px ${(1 - progress) * (width - anchor.x - anchor.width)}px ${(1 - progress) * (height - anchor.y - anchor.height)}px ${(1 - progress) * anchor.x}px round ${morphRadius * (1 - progress)}px)`
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
        ? `blur(${(Math.sin(progress * Math.PI) * settings.transitionBlur * settings.blurStrength * settings.shutterAngle) / 180}px)`
        : undefined,
  };
}

/**
 * Remotion presentation. CSS blur keeps stateful product children
 * single-instance.
 */
export function SceneTransition({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}: TransitionPresentationComponentProps<SceneTransitionProps>): ReactNode {
  const theme = useMotionSettingsTheme();
  return (
    <AbsoluteFill
      style={getSceneTransitionStyle(
        presentationProgress,
        presentationDirection === "entering",
        passedProps,
        theme,
      )}
    >
      {children}
    </AbsoluteFill>
  );
}

/** The timing and presentation a `TransitionSeries.Transition` takes. */
type SceneTransitionSpec = {
  timing: TransitionTiming;
  presentation: {
    component: typeof SceneTransition;
    props: SceneTransitionProps;
  };
};

/**
 * Matching timing and presentation for TransitionSeries. Cuts need no
 * Transition element.
 */
export function createSceneTransition(
  {
    durationInFrames,
    ...props
  }: SceneTransitionProps & {
    durationInFrames: number;
  },
  theme: MotionSettingsTheme = getClassicMotionSettingsTheme(),
): SceneTransitionSpec {
  const duration = getMotionDuration(durationInFrames, props.motion, theme);
  if (duration < 1 || props.kind === "cut")
    throw new Error("Cuts use adjacent sequences without a Transition element");
  return {
    timing: linearTiming({
      durationInFrames: duration,
      easing: getMotionEasing(props.motion, undefined, theme),
    }),
    presentation: { component: SceneTransition, props },
  };
}
