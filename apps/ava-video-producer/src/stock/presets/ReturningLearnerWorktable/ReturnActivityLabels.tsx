import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SceneText } from "./SceneText";
import type { Input } from "./ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

type Props = {
  activity: Input["returnActivities"][number];
  input: Input;
  index: number;
};
/** Draws the ReturnActivityLabels group with fixed authored geometry. */
export function ReturnActivityLabels({
  activity,
  input,
  index,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const labelX = 180 + index * 300;
  return (
    <>
      <g>
        <SceneText
          text={String(index + 1)}
          color={tokens.color.highlight}
          slot={[labelX - 138, 460, 24, 14, 1]}
        />
        <SceneText
          text={activity.label}
          anchor="middle"
          slot={[labelX, 460, 245, 14, 3]}
        />
        <SceneText
          text={input.activityLabels[activity.kind]}
          anchor="middle"
          slot={[labelX, 526, 260, 12, 3]}
        />
      </g>
    </>
  );
}
