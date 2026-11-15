import { Composition, registerRoot } from "remotion";
import "./theme.css";
import importPlan from "../storyboards/import.json";
import { AvandarScene } from "./avandar/AvandarScene";
import { createContinuityPlanFromVideoThemeSnapshot } from "./continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import {
  storyboardSchema,
  durationInFrames,
  type Storyboard,
} from "./storyboard/schema/schema";
import { ThemedStoryFilm } from "./storyboard/ThemedStoryFilm/ThemedStoryFilm";
import type { VideoThemeSnapshot } from "./videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";

const defaults = storyboardSchema.parse(importPlan);
function ProductFilm({
  plan,
  theme,
}: {
  plan: Storyboard;
  theme?: VideoThemeSnapshot;
}) {
  return (
    <ThemedStoryFilm plan={plan} theme={theme} productScene={AvandarScene} />
  );
}
function Root() {
  return (
    <Composition
      id="story-film"
      component={ProductFilm}
      defaultProps={{ plan: defaults }}
      calculateMetadata={({ props }) => {
        const plan = storyboardSchema.parse(props.plan);
        return {
          props: { plan, theme: props.theme },
          durationInFrames: durationInFrames(
            createContinuityPlanFromVideoThemeSnapshot(plan, props.theme, [
              plan.id,
            ]),
          ),
          fps: plan.fps,
          width: plan.width,
          height: plan.height,
        };
      }}
      durationInFrames={durationInFrames(defaults)}
      fps={30}
      width={1600}
      height={1000}
    />
  );
}
registerRoot(Root);
