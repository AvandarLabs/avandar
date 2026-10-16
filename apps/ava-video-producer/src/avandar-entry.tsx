import { Composition, registerRoot } from "remotion";
import "./theme.css";
import importPlan from "../storyboards/import.json";
import { AvandarScene } from "./avandar/AvandarScene";
import {
  storyboardSchema,
  durationInFrames,
  type Storyboard,
} from "./storyboard/schema/schema";
import { StoryFilm } from "./storyboard/StoryFilm/StoryFilm";
const defaults = storyboardSchema.parse(importPlan);
function ProductFilm({ plan }: { plan: Storyboard }) {
  return <StoryFilm plan={plan} productScene={AvandarScene} />;
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
          props: { plan },
          durationInFrames: durationInFrames(plan),
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
