import { ramp } from "../../../motion";
import { ObservationSlot } from "./ObservationSlot";
import { ProseHeadings } from "./ProseHeadings";
import { SentenceSpans } from "./SentenceSpans";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ProseMeasurementLedger.schema";
import type { ReactNode } from "react";
/** Complete validated authored content and frame palette. */
export type Props = GraphicProps & { input: Input };
/** Keeps source context, exact semantic spans and review status together. */
export function ProseMeasurementLedger({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={ramp(frame, 0, 12)}
      data-method={input.method}
      data-review={input.reviewState}
    >
      <ProseHeadings input={input} frame={frame} />
      <SentenceSpans input={input} frame={frame} accent={accent} />
      {Array.from({ length: 6 }, (_, index) => (
        <ObservationSlot
          key={index}
          input={input}
          frame={frame}
          accent={accent}
          index={index}
        />
      ))}
    </g>
  );
}
