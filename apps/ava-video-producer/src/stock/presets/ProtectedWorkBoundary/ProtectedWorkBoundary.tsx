import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { BoundaryRequest } from "./BoundaryRequest";
import { BoundaryWorker } from "./BoundaryWorker";
import { ProtectedSlot } from "./ProtectedSlot";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";
/** Frame-driven finite schedule and authored request disposition. */
export type Props = GraphicProps & { input: Input };
/** Preserves existing commitments while a worker moves the incoming request. */
export function ProtectedWorkBoundary({
  frame,
  input,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <defs>
        <pattern
          id={`${id}-protected`}
          width={8}
          height={8}
          patternUnits="userSpaceOnUse"
        >
          {input.protectedPattern === "hatch" ? (
            <path d="M0 8 L8 0" stroke={STOCK.muted} strokeWidth={1} />
          ) : (
            <circle cx={3} cy={3} r={1.2} fill={STOCK.muted} />
          )}
        </pattern>
      </defs>
      <LabelSlots
        labels={[
          [input.labels.unit, 45, 550, 400, 14, 3],
          [input.labels.example, 500, 550, 410, 14, 3],
          [input.labels.protected, 45, 195, 500, 12, 2],
        ]}
      />
      <BoundaryWorker frame={frame} input={input} accent={accent} />
      {input.slots.map((slot, index) => (
        <ProtectedSlot
          key={slot.id}
          slot={slot}
          index={index}
          frame={frame}
          input={input}
          accent={accent}
          id={id}
        />
      ))}
      <BoundaryRequest frame={frame} input={input} accent={accent} />
    </g>
  );
}
