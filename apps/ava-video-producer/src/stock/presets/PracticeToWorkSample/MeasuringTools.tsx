import { STOCK } from "../../stockPalette";
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
  return isMeasuring ? (
    <g data-measuring-hand={isApplication ? "application" : "practice"}>
      <path
        data-ruler-hand="true"
        d={`M${x - 8} 235 L${origin - 10} ${rulerY + 12}`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      <rect
        data-ruler="true"
        x={origin - 14}
        y={rulerY + 6}
        width={input.task.value * 12 + 28}
        height={16}
        fill={STOCK.orange}
        fillOpacity={0.2}
        stroke={STOCK.orange}
      />
      <RulerTicks input={input} origin={origin} rulerY={rulerY} />
      <path
        data-pencil-hand="true"
        d={`M${x + 8} 235 L${pencilX + 5} ${rulerY - 14}`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      <path
        data-pencil="true"
        d={`M${pencilX + 5} ${rulerY - 14} L${pencilX} ${rulerY}`}
        fill="none"
        stroke={STOCK.text}
        strokeWidth={4}
      />
    </g>
  ) : undefined;
}
