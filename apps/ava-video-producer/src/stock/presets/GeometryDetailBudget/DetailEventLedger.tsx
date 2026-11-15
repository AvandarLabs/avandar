import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/**
 * Depth-first segment, farthest-index, deviation and tolerance event values.
 */
export function DetailEventLedger({ input }: Readonly<Props>): ReactNode {
  const { events } = makeDetailSimplificationFromInput(input);
  return (
    <g>
      {events.map((event, index) => (
        <LabelSlots
          key={`${event.start}:${event.end}`}
          labels={[
            [
              `${event.start + 1} → ${event.end + 1} · ${event.farthest + 1} : ${String(event.distance)} ${event.split ? ">" : "≤"} ${input.tolerance}`,
              480 + (index % 2) * 220,
              415 + Math.floor(index / 2) * 63,
              210,
              12,
              4,
            ],
          ]}
        />
      ))}
    </g>
  );
}
