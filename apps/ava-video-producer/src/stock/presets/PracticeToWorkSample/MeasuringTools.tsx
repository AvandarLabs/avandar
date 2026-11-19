import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { RulerTicks } from "./RulerTicks";
import type { Input } from "./PracticeToWorkSample.schema";
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
export function MeasuringTools({
  input,
  isMeasuring,
  isApplication,
  x,
  origin,
  rulerY,
  pencilX,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return isMeasuring ? (
    <g data-measuring-hand={isApplication ? "application" : "practice"}>
      <g data-ruler-hand="true">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x - 8} 235 L${origin - 10} ${rulerY + 12}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
      <StockRect
        data-ruler="true"
        x={origin - 14}
        y={rulerY + 6}
        width={input.task.value * 12 + 28}
        height={16}
        fill={tokens.color.highlight}
        fillOpacity={scales.wash(atomic.opacity["20"])}
        stroke={tokens.color.highlight}
      />
      <RulerTicks input={input} origin={origin} rulerY={rulerY} />
      <g data-pencil-hand="true">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x + 8} 235 L${pencilX + 5} ${rulerY - 14}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
      <g data-pencil="true">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${pencilX + 5} ${rulerY - 14} L${pencilX} ${rulerY}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.text}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      </g>
    </g>
  ) : undefined;
}
