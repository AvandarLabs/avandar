import { match } from "ts-pattern";
import { MotionRect } from "./getOverlayTimings";
import { MotionSettings } from "./MotionSettings/MotionSettings";
import type {
  MotionOptions,
  MotionSettingsTheme,
} from "./MotionSettings/MotionSettings";
import type { CSSProperties } from "react";

type GetSceneTransitionStyleOptions = {
  progress: number;
  entering: boolean;
  props: SceneTransitionProps;
  theme?: MotionSettingsTheme;
};
/** Reveal and continuity treatments available to any TransitionSeries. */
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
  origin?: {
    x: number;
    y: number;
  };
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
type TransitionClipPathOptions = {
  props: SceneTransitionProps;
  entering: boolean;
  kind: SceneTransitionKind;
  progress: number;
};
function _getTransitionClipPath({
  props,
  entering,
  kind,
  progress,
}: Readonly<TransitionClipPathOptions>): string | undefined {
  const {
    width = 1600,
    height = 840,
    morphRadius = 12,
    apertureOverscan = 1.05,
  } = props;
  const origin = props.origin ?? { x: width / 2, y: height / 2 };
  const anchor = props.anchor ?? {
    x: width * 0.36,
    y: height * 0.47619,
    width: width * 0.15,
    height: height / 14,
  };
  if (!entering) {
    return undefined;
  }
  return match(kind)
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
}
/**
 * Scene geometry is independent of playback history and uses one native UI
 * instance per scene.
 */
export function getSceneTransitionStyle({
  progress,
  entering,
  props,
  theme = MotionSettings.getClassicMotionSettingsTheme(),
}: Readonly<GetSceneTransitionStyleOptions>): CSSProperties {
  const {
    width = 1600,
    height = 840,
    cameraMotion = true,
    motionBlur = true,
  } = props;
  const kind = cameraMotion ? props.kind : "dissolve";
  const settings = MotionSettings.resolveMotionSettings({
    options: props.motion,
    theme,
  });
  const clipPath = _getTransitionClipPath({ props, entering, kind, progress });
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
