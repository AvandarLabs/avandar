import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { DrillBreadcrumb } from "./DrillBreadcrumb";
import { DrillCompartments } from "./DrillCompartments";
import { DrillRecord } from "./DrillRecord";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./NestedDrilldownWindow.schema";
import type { ReactNode } from "react";
/** Frame, theme and complete validated authored input. */
export type Props = GraphicProps & { input: Input };
/** Record identities move through exactly the authored dimension prefix. */
export function NestedDrilldownWindow({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 12, 20)}>
      <FitText
        text={input.labels.title}
        x={44}
        y={50}
        width={872}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <DrillBreadcrumb input={input} />
      <DrillCompartments frame={frame} input={input} accent={accent} />
      {input.records.map((record) => (
        <DrillRecord
          key={record.id}
          frame={frame}
          input={input}
          record={record}
          accent={accent}
        />
      ))}
    </g>
  );
}
