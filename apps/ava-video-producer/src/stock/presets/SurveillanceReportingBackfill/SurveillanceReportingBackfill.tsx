import { propEq } from "@avandar/utils";
import { ramp, mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { BackfillChart } from "./BackfillChart";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SurveillanceReportingBackfill.schema";
import type { ReactNode } from "react";
/** Explicit authored scene props. */
export type Props = GraphicProps & { input: Input };
/**
 * SurveillanceReportingBackfill renders the supplied quantities and explicit
 * timeline.
 */
export function SurveillanceReportingBackfill({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const earlier = input.records.filter(propEq("firstSnapshot", 0)).length;
  return (
    <g data-earlier-total={earlier} data-revised-total={input.records.length}>
      <LabelSlots
        labels={[
          [input.copy.context, 60, 30, 840, 16, 2],
          [input.copy.earlier, 60, 68, 400, 14, 3],
          [input.copy.revised, 500, 68, 400, 14, 3],
          [input.snapshots[0].label, 60, 127, 400, 14, 3],
          [input.snapshots[1].label, 500, 127, 400, 14, 3],
          [String(earlier), 60, 190, 100, 18, 1],
          [String(input.records.length), 500, 190, 100, 18, 1],
          [input.copy.newReports, 60, 225, 560, 12, 2],
          [input.copy.axis, 60, 575, 560, 12, 2],
          [input.copy.unit, 670, 548, 230, 12, 4],
        ]}
      />
      <path
        data-reporting-tab=""
        d={`M${mix(ramp(frame, 36, 36), 60, 500)} 198h380`}
        stroke={accent}
        strokeWidth={3}
      />
      <BackfillChart input={input} frame={frame} accent={accent} />
      {input.records.map((record, index) => (
        <LabelSlots
          key={record.id}
          labels={[
            [String(index + 1), 600, 190 + index * 28, 24, 12, 1],
            [record.label, 630, 190 + index * 28, 280, 12, 1],
          ]}
        />
      ))}
    </g>
  );
}
