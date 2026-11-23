import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { PracticeActionLabels } from "./PracticeActionLabels";
import { usePracticeStripPresentation } from "./usePracticeStripPresentation";
import type { Input } from "../SchoolTransitionRehearsal.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; learnerX: number; accent: string };
/** The learner carries the same ordered two-action strip. */
export function PracticeStrip(props: Readonly<Props>): ReactNode {
  const presentation = usePracticeStripPresentation(props);

  return (
    <g>
      {" "}
      {props.input.showPracticeStrip ? (
        <g data-practice-strip="">
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${props.learnerX - 8} 395 L${props.learnerX - 20} 430`,
            }}
            profile={presentation.tokens.sketch.shape}
            stroke={props.accent}
            strokeWidth={presentation.scales.stroke(
              presentation.tokens.stroke.emphasis,
            )}
          />
          <StockRect
            x={props.learnerX - 160}
            y={430}
            width={320}
            height={100}
            rx={presentation.scales.corner(5)}
            fill={presentation.tokens.color.surface}
            stroke={props.accent}
          />
          <SketchedShape
            shape={{
              kind: "line",
              x1: props.learnerX,
              y1: 436,
              x2: props.learnerX,
              y2: 520,
            }}
            profile={presentation.tokens.sketch.shape}
            stroke={presentation.tokens.color.line}
          />
          <PracticeActionLabels {...presentation} />
        </g>
      ) : undefined}
    </g>
  );
}
