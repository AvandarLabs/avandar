import { STOCK } from "../../stockPalette";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";
type Props = { input: Input; origin: number; rulerY: number };
/** Ruler Ticks for the authored scene. */
export function RulerTicks({
  input,
  origin,
  rulerY,
}: Readonly<Props>): ReactNode {
  return Array.from({ length: input.task.value + 1 }, (_, index) => (
    <path
      key={index}
      d={`M${origin + index * 12} ${rulerY + 6} v7`}
      stroke={STOCK.orange}
    />
  ));
}
