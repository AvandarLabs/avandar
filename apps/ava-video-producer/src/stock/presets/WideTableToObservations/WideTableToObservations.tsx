import { ramp } from "../../../motion";
import { MeasurementStrip } from "./MeasurementStrip";
import { WideLedgerCaptions } from "./WideLedgerCaptions";
import { WideSourceGuides } from "./WideSourceGuides";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./WideTableToObservations.schema";
import type { ReactNode } from "react";
/** Complete validated source measurements and frame palette. */
export type Props = GraphicProps & { input: Input };
/** Unpivots exact cells into rows without manufacturing measurements. */
export function WideTableToObservations({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 0, 12)}>
      <WideLedgerCaptions input={input} frame={frame} />
      <WideSourceGuides input={input} frame={frame} />
      {input.measures.flatMap((measure, measureIndex) =>
        input.subjects.map((subject, subjectIndex) => (
          <MeasurementStrip
            key={`${subjectIndex}:${measureIndex}`}
            input={input}
            frame={frame}
            accent={accent}
            subjectIndex={subjectIndex}
            measureIndex={measureIndex}
          />
        )),
      )}
    </g>
  );
}
