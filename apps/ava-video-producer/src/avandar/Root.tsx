import { Composition } from "remotion";
import importPlan from "../../storyboards/import.json";
import { ContinuityThemePlans } from "../continuity/ContinuityThemePlans/ContinuityThemePlans";
import { storyboardSchema } from "../storyboard/schema/schema";
import { StoryboardTimeline } from "../storyboard/schema/StoryboardTimeline";
import { ProductFilm } from "./ProductFilm";
import type { ReactNode } from "react";

const defaults = storyboardSchema.parse(importPlan);
/** The Remotion root for storyboard films with real Avandar product shots. */
export function Root(): ReactNode {
  return (
    <Composition
      id="story-film"
      component={ProductFilm}
      defaultProps={{ plan: defaults }}
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
      durationInFrames={StoryboardTimeline.durationInFrames(defaults)}
      fps={30}
      width={1600}
      height={1000}
    />
  );
}
