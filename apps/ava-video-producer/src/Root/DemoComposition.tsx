import { Composition } from "remotion";
import { DEMO_LEN } from "../compositions/Demo/Demo";
import { StoryboardTimeline } from "../storyboard/schema/StoryboardTimeline";
import "../theme.css";
import { TITLE_LEN } from "../TitleCard/TitleCard";
import { DemoClip } from "./DemoClip";
import { FPS, WIDTH, HEIGHT } from "./RootDefaults";
import type { ReactNode } from "react";
/** Registers the demo composition. */
export function DemoComposition(): ReactNode {
  return (
    <Composition
      id="demo"
      component={DemoClip}
      durationInFrames={DEMO_LEN + TITLE_LEN}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
