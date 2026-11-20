import { mix } from "../../../motion";
import { MotionSettings } from "../../../motion-components/MotionSettings/MotionSettings";
import { StageTheme } from "../../StageTheme/StageTheme";
import {
  type WindowStage,
  type WindowPose,
  type ScrollStep,
} from "./WindowMotion.types";

let classicWindowStage: WindowStage | undefined;
/** `classic`'s window stage, the default of every window helper. */
function _getClassicWindowStage(): WindowStage {
  const theme = StageTheme.getClassicStageTheme();
  classicWindowStage ??= {
    motion: StageTheme.getClassicStageMotion(),
    tilt: theme.components.WindowTilt,
    window: theme.components.WindowMotion,
    settings: MotionSettings.getClassicMotionSettingsTheme(),
  };
  return classicWindowStage;
}
/** The window at rest in its box, on the theme's tilt. */
function _getRestingPose(
  stage: WindowStage = _getClassicWindowStage(),
): WindowPose {
  return {
    translateX: 0,
    translateZ: 0,
    rotateY: stage.tilt.rotateY,
    opacity: 1,
    blurX: 0,
  };
}
/**
 * Which headline is on screen and its opacity. Each headline dissolves out
 * over the press duration, ending where the next one starts.
 */
function _getActiveHeadline({
  frame,
  headlines,
  stage = _getClassicWindowStage(),
}: Readonly<{
  frame: number;
  headlines: ReadonlyArray<{
    atFrame: number;
  }>;
  stage?: WindowStage;
}>): {
  index: number;
  opacity: number;
} {
  const index = headlines.reduce((latest, headline, position) => {
    return position > 0 && headline.atFrame <= frame ? position : latest;
  }, 0);
  const next = headlines[index + 1];
  const { motion } = stage;
  const fade = motion.press.duration;
  const opacity = next
    ? 1 - motion.ramp(frame, next.atFrame - fade, fade, motion.dissolve.easing)
    : 1;
  return { index, opacity };
}
/**
 * How far tall window content has scrolled, after quick authored jumps over
 * the press duration.
 */
function _getScrollOffset({
  frame,
  steps,
  stage = _getClassicWindowStage(),
}: Readonly<{
  frame: number;
  steps: readonly ScrollStep[];
  stage?: WindowStage;
}>): number {
  const { motion } = stage;
  return steps.reduce((offset, step) => {
    return mix(
      motion.ramp(
        frame,
        step.atFrame,
        motion.press.duration,
        motion.entrance.easing,
      ),
      offset,
      step.offset,
    );
  }, 0);
}
/**
 * Shared stage defaults and timed reading states for window scenes and helper
 * previews.
 */
export const WindowReadingMotion = {
  /** The classic stage defaults for unthemed window helpers. */
  getClassicWindowStage: _getClassicWindowStage,
  /** The stationary window pose in its themed plane. */
  getRestingPose: _getRestingPose,
  /** The active authored headline and its fade opacity. */
  getActiveHeadline: _getActiveHeadline,
  /** The vertical offset after authored reading steps. */
  getScrollOffset: _getScrollOffset,
} as const;
