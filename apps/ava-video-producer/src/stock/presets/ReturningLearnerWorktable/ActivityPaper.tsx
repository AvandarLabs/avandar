import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneText } from "./SceneText";
import type { Input } from "./ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

type Props = {
  activity: Input["returnActivities"][number];
  index: number;
  x: number;
  accent: string;
};
/** Draws the ActivityPaper group with fixed authored geometry. */
export function ActivityPaper({
  activity,
  index,
  x,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <g
        data-activity-object={activity.id}
        data-new-activity={activity.kind === "new" ? true : undefined}
        transform={`translate(${x} 365)`}
      >
        <StockRect
          x={-22}
          y={-23}
          width={44}
          height={46}
          rx={scales.corner(3)}
          fill={tokens.color.surface}
          stroke={
            activity.kind === "review"
              ? tokens.color.accentAlt
              : tokens.color.highlight
          }
        />
        <SketchedShape
          shape={{
            kind: "path",
            d:
              activity.kind === "review"
                ? "M-10 3 Q-14 -11 0 -11 Q14 -11 10 3 M4 -2 L10 4 L15 -3"
                : "M-11 -4 L-3 5 L4 -4 L12 5",
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
        <SceneText
          text={String(index + 1)}
          anchor="middle"
          slot={[0, 19, 36, 12, 1]}
        />
      </g>
    </>
  );
}
