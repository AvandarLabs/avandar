import { ramp, mix, EASE } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The typed numeric condition arrives at the source before gates close. */
export function PushdownPredicate({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const predicateX = mix(ramp(frame, 13, 37, EASE.inOut), 300, 64);
  return (
    <g data-predicate="true" data-unit={input.metric.unit} data-x={predicateX}>
      <StockRect
        x={predicateX - 8}
        y={92}
        width={364}
        height={82}
        rx={10}
        fill={STOCK.elevated}
        stroke={accent}
      />
      <LabelSlots
        labels={[
          [input.metric.label, predicateX, 109, 346, 12, 2],
          [
            `${input.predicate.operator} ${input.predicate.threshold}`,
            predicateX,
            139,
            160,
            12,
            3,
          ],
          [input.metric.unit, predicateX + 174, 139, 172, 12, 3],
        ]}
      />
      {frame >= 50 ? (
        <g opacity={ramp(frame, 50, 12)}>
          <LabelSlots
            labels={[[input.labels.condition, 516, 109, 396, 12, 2]]}
          />
        </g>
      ) : undefined}
    </g>
  );
}
