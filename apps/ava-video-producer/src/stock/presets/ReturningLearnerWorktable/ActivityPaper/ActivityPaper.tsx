import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SceneText } from "../SceneText";
import { ActivityGlyph } from "./ActivityGlyph";
import type { Input } from "../ReturningLearnerWorktable.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
        <ActivityGlyph isReview={activity.kind === "review"} accent={accent} />
        <SceneText
          text={String(index + 1)}
          anchor="middle"
          slot={[0, 19, 36, 12, 1]}
        />
      </g>
    </>
  );
}
