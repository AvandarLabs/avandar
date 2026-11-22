import { AbsoluteFill } from "remotion";
import type {
  SceneTransitionProps} from "./getSceneTransitionStyle";
import {
  getSceneTransitionStyle,
} from "./getSceneTransitionStyle";
import { MotionSettings } from "./MotionSettings/MotionSettings";
import type { TransitionPresentationComponentProps as Props } from "@remotion/transitions";
import type { ReactNode } from "react";
/**
 * Remotion presentation. CSS blur keeps stateful product children
 * single-instance.
 */
export function SceneTransition({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}: Props<SceneTransitionProps>): ReactNode {
  const theme = MotionSettings.useMotionSettingsTheme();
  return (
    <AbsoluteFill
      style={getSceneTransitionStyle({
        progress: presentationProgress,
        entering: presentationDirection === "entering",
        props: passedProps,
        theme,
      })}
    >
      {children}
    </AbsoluteFill>
  );
}
