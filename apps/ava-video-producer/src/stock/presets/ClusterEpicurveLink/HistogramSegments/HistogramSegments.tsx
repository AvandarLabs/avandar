import { getCasePositionsFromInput } from "../getCasePositionsFromInput";
import { HistogramCase } from "./HistogramCase";
import type { Input } from "../ClusterEpicurveLink.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Every case supplies exactly one numbered segment, including unknown onset.
 */
export function HistogramSegments({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {getCasePositionsFromInput(input).map((position) => {
        return (
          <HistogramCase
            key={position.record.id}
            position={position}
            frame={frame}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
