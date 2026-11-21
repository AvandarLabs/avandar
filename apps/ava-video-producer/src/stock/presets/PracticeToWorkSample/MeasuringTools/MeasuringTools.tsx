import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { RulerTicks } from "../RulerTicks";
import { PencilHand } from "./PencilHand";
import { RulerHand } from "./RulerHand";
import { useMeasuringToolsPresentation } from "./useMeasuringToolsPresentation";
import type { Input } from "../PracticeToWorkSample.schema.ts";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  isMeasuring: boolean;
  isApplication: boolean;
  x: number;
  origin: number;
  rulerY: number;
  pencilX: number;
  accent: string;
};
/** Measuring Tools for the authored scene. */
export function MeasuringTools(props: Readonly<Props>): ReactNode {
  const presentation = useMeasuringToolsPresentation(props);

  return props.isMeasuring ? (
    <g data-measuring-hand={props.isApplication ? "application" : "practice"}>
      <RulerHand {...presentation} />
      <StockRect
        data-ruler="true"
        x={props.origin - 14}
        y={props.rulerY + 6}
        width={props.input.task.value * 12 + 28}
        height={16}
        fill={presentation.tokens.color.highlight}
        fillOpacity={presentation.scales.wash(
          presentation.atomic.opacity["20"],
        )}
        stroke={presentation.tokens.color.highlight}
      />
      <RulerTicks
        input={props.input}
        origin={props.origin}
        rulerY={props.rulerY}
      />
      <PencilHand {...presentation} />
      <g data-pencil="true">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${props.pencilX + 5} ${props.rulerY - 14} L${props.pencilX} ${props.rulerY}`,
          }}
          profile={presentation.tokens.sketch.shape}
          fill="none"
          stroke={presentation.tokens.color.text}
          strokeWidth={presentation.scales.stroke(
            presentation.tokens.stroke.heavy,
          )}
        />
      </g>
    </g>
  ) : undefined;
}
