import { CaptionLayout } from "../../../../scenes/layout/CaptionLayout";
import type {
  StoryboardIssue,
  StoryboardPlan,
  StoryboardShot,
} from "./storyboardValidation.types";
/** Checks the authored avandar scene and reports its issues in order. */
export function validateAvandarShot({
  plan,
  shot,
  issue,
}: Readonly<{
  plan: Readonly<StoryboardPlan>;
  shot: Extract<StoryboardShot, { scene: "avandar" }>;
  issue: StoryboardIssue;
}>): void {
  const stageHeight =
    plan.height -
    (plan.captions
      ? CaptionLayout.captionBand({
          cues: plan.narration,
          width: plan.width,
          height: plan.height,
        })
      : 0);
  if (plan.width !== 1600 || stageHeight !== 840) {
    issue(
      `${shot.id}: measured Avandar scenes require a 1600 × 840 stage (1600 × 1000 with single-line captions)`,
    );
  }
  if (shot.props.mode !== "full" && shot.props.feature !== "explorer") {
    issue(`${shot.id}: only Explorer supports partial modes`);
  }
  const horizons = {
    import: 660,
    explorer: 800,
    dashboards: 720,
    cases: 660,
    map: 720,
  };
  const horizon =
    shot.props.feature === "explorer" && shot.props.mode !== "full"
      ? { filter: 300, query: 330, chart: 230 }[shot.props.mode]
      : horizons[shot.props.feature];
  if (shot.props.fromFrame + shot.durationInFrames > horizon) {
    issue(`${shot.id}: Avandar shot extends past its authored timeline`);
  }
}
