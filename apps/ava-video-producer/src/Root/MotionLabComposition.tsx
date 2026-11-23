import { Composition } from "remotion";
import { MOTION_LAB_LEN } from "../compositions/MotionLab/MotionLab";
import { StoryboardTimeline } from "../storyboard/schema/StoryboardTimeline";
import "../theme.css";
import { TITLE_LEN } from "../TitleCard/TitleCard";
import { MotionLabClip } from "./MotionLabClip";
import { FPS, WIDTH, HEIGHT } from "./RootDefaults";
import type { ReactNode } from "react";
/** Registers the motion-lab composition. */
export function MotionLabComposition(): ReactNode {
  return (
    <Composition
      id="motion-lab"
      component={MotionLabClip}
      durationInFrames={MOTION_LAB_LEN + TITLE_LEN}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
