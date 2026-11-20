import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./QueryColumnCacheGrowth.schema";
import type { ReactNode } from "react";

type Props = { input: Input; missingIds: string[] };
/**
 * Missing column labels remain explicit independently of set-notation display.
 */
export function MissingCacheColumns({
  input,
  missingIds,
}: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps("QueryColumnCacheGrowth", {});
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { color, sketch } = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {missingIds.map((id, index) => {
        const column = input.columns.find(propEq("id", id))!;
        return (
          <g key={id} data-missing-column={id}>
            <StockRect
              x={60 + index * 168}
              y={191}
              width={158}
              height={60}
              fill="none"
              stroke={color.highlight}
              strokeDasharray={style.missingDash.join(" ")}
              strokeWidth={scales.stroke(style.missingStrokeWidth)}
            />
            <LabelSlots
              labels={[[column.label, 70 + index * 168, 210, 138, 14, 3]]}
            />
            <SketchedShape
              shape={{
                kind: "path",
                d: `M${198 + index * 168} 238 h10 m-5 -5 v10`,
              }}
              profile={sketch.shape}
              stroke={color.highlight}
              strokeWidth={scales.stroke(style.missingStrokeWidth)}
            />
          </g>
        );
      })}
    </g>
  );
}
