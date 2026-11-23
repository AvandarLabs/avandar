import { Composition } from "remotion";
import libraryPlan from "../../storyboards/library.json";
import { ContinuityThemePlans } from "../continuity/ContinuityThemePlans/ContinuityThemePlans";
import "../theme.css";
import { storyboardSchema } from "../storyboard/schema/schema";
import { StoryboardTimeline } from "../storyboard/schema/StoryboardTimeline";
import { ThemedStoryFilm } from "../storyboard/ThemedStoryFilm";
import type { ReactNode } from "react";

/** Registers the story-film composition. */
export function StoryFilmComposition(): ReactNode {
  return (
    <Composition
      id="story-film"
      component={ThemedStoryFilm}
      defaultProps={{ plan: storyboardSchema.parse(libraryPlan) }}
      calculateMetadata={({ props }) => {
        const plan = storyboardSchema.parse(props.plan);
        return {
          props: { plan, theme: props.theme },
          durationInFrames: StoryboardTimeline.durationInFrames(
            ContinuityThemePlans.fromVideoThemeSnapshot({
              plan,
              snapshot: props.theme,
              overrideIds: [plan.id],
            }),
          ),
          fps: plan.fps,
          width: plan.width,
          height: plan.height,
        };
      }}
      durationInFrames={StoryboardTimeline.durationInFrames(
        storyboardSchema.parse(libraryPlan),
      )}
      fps={30}
      width={1600}
      height={1000}
    />
  );
}
