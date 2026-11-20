import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import { useWindowStage } from "./useWindowStage";
import { HEADLINE_BOX, WINDOW_BOXES } from "./windowTilt";
import type { TiltedWindowSceneProps } from "../scenes.types";
import type { ReactNode } from "react";
/** A small muted note at the bottom left that fades out with the exit. */
export function WindowFootnote({
  frame,
  text,
  exit,
}: {
  frame: number;
  text: string;
  exit: TiltedWindowSceneProps["exit"];
}): ReactNode {
  const theme = useVideoTheme();
  const { motion } = useWindowStage();
  const fade = exit
    ? 1 -
      motion.ramp(frame, exit.atFrame + 1, motion.chip, motion.dissolve.easing)
    : 1;
  const arrive = motion.ramp(frame, 1, motion.panel, motion.entrance.easing);
  return (
    <p
      style={{
        position: "absolute",
        left: `${HEADLINE_BOX.x * 100}%`,
        bottom: 40,
        margin: 0,
        fontSize: theme.mantine.fontSizes.xl,
        color: theme.semantic.color.scene.mutedForeground,
        opacity: arrive * fade,
      }}
    >
      {text}
    </p>
  );
}
