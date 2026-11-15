import { STOCK } from "../../stockPalette";
import type { getSpliceGeometryFromInputAndFrame } from "./getSpliceGeometryFromInputAndFrame";
import type { Input } from "./PipelineStepSplice.schema";
import type { ReactNode } from "react";

type Step = ReturnType<typeof getSpliceGeometryFromInputAndFrame>[number];
type Props = {
  from: Step;
  to: Step;
  index: number;
  closing: number;
  joinStyle: Input["joinStyle"];
  accent: string;
};
/** Closing joints meet the actual adjacent module boundaries. */
export function SpliceJoint({
  from,
  to,
  index,
  closing,
  joinStyle,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={closing}>
      <line
        data-final-join={index}
        data-from={from.id}
        data-to={to.id}
        x1={from.x + 140}
        y1={345}
        x2={to.x}
        y2={345}
        stroke={accent}
        strokeWidth={joinStyle === "continuous-ribbon" ? 12 : 2}
      />
      {joinStyle === "tabbed" ? (
        <path
          d={`M${to.x - 14} 337h14v16h-14Z`}
          fill={STOCK.elevated}
          stroke={accent}
        />
      ) : undefined}
    </g>
  );
}
