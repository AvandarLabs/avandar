import { STOCK } from "../../stockPalette";
import { AlignmentGuides } from "./AlignmentGuides";
import { MeasurementMark } from "./MeasurementMark";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  x: number;
  y: number;
  progress: number;
  isPractice: boolean;
  accent: string;
};
/** Both material samples carry the exact same authored measurement and unit. */
export function MeasuredArtifact({
  input,
  x,
  y,
  progress,
  isPractice,
  accent,
}: Readonly<Props>): ReactNode {
  const material = isPractice ? "sheet" : input.workpieces.material;
  return (
    <g data-artifact={material} transform={`translate(${x} ${y})`}>
      <rect
        width={220}
        height={116}
        rx={material === "fabric" ? 14 : 2}
        fill={STOCK.surface}
        stroke={isPractice ? STOCK.text : STOCK.orange}
        strokeWidth={2}
      />
      {material === "wood" ? (
        <path
          d="M8 20 Q80 6 212 20 M8 93 Q150 108 212 94"
          fill="none"
          stroke={STOCK.orange}
          strokeOpacity={0.3}
        />
      ) : undefined}
      {material === "fabric" ? (
        <path
          d="M7 7 H213 V109 H7 Z"
          fill="none"
          stroke={STOCK.mint}
          strokeDasharray="3 5"
        />
      ) : undefined}
      <MeasurementMark
        input={input}
        progress={progress}
        isPractice={isPractice}
        accent={accent}
      />
      <AlignmentGuides input={input} />
    </g>
  );
}
