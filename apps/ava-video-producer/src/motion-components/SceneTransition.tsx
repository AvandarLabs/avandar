import { AbsoluteFill } from "remotion";
import { getSceneTransitionStyle } from "./getSceneTransitionStyle";
import type { SceneTransitionProps } from "./getSceneTransitionStyle";
import type { TransitionPresentationComponentProps } from "@remotion/transitions";
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
}: TransitionPresentationComponentProps<SceneTransitionProps>): ReactNode {
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
