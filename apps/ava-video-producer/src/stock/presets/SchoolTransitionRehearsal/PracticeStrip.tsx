import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";

type Props = { input: Input; learnerX: number; accent: string };
/** The learner carries the same ordered two-action strip. */
export function PracticeStrip({
  input,
  learnerX,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {" "}
      {input.showPracticeStrip ? (
        <g data-practice-strip="">
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${learnerX - 8} 395 L${learnerX - 20} 430`,
            }}
            profile={tokens.sketch.shape}
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          />
          <StockRect
            x={learnerX - 160}
            y={430}
            width={320}
            height={100}
            rx={scales.corner(5)}
            fill={tokens.color.surface}
            stroke={accent}
          />
          <SketchedShape
            shape={{
              kind: "line",
              x1: learnerX,
              y1: 436,
              x2: learnerX,
              y2: 520,
            }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.line}
          />
          <LabelSlots
            labels={input.stops.map((stop, index) => {
              return [
                stop.actionLabel,
                learnerX - 150 + index * 160,
                450,
                140,
                12,
                5,
              ];
            })}
          />
        </g>
      ) : undefined}
    </g>
  );
}
