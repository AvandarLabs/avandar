import { Composition } from "remotion";
import { TITLE_STUDY_LEN } from "../compositions/TitleStudy";
import { StoryboardTimeline } from "../storyboard/schema/StoryboardTimeline";
import "../theme.css";
import { FPS, WIDTH, HEIGHT } from "./RootDefaults";
import { TitleStudyClip } from "./TitleStudyClip";
import type { ReactNode } from "react";
/** Registers the title-study composition. */
export function TitleStudyComposition(): ReactNode {
  return (
    <Composition
      id="title-study"
      component={TitleStudyClip}
      durationInFrames={TITLE_STUDY_LEN}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
