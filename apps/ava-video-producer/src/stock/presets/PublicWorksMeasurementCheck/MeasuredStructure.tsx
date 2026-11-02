import { STOCK } from "../../stockPalette";
import { MeasurementRuler } from "./MeasurementRuler";
import type { Input } from "./PublicWorksMeasurementCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/**
 * One physical dimension uses the same 65-pixel unit for promise and object.
 */
export function MeasuredStructure({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const promisedWidth = input.specification.length * 65;
  const observedWidth = input.observation.length * 65;
  return (
    <g>
      <rect
        data-promised-outline=""
        x={200}
        y={266}
        width={promisedWidth}
        height={94}
        fill="none"
        stroke={STOCK.muted}
        strokeDasharray="6 5"
      />
      <rect
        data-actual-structure={input.structure}
        x={200}
        y={275}
        width={observedWidth}
        height={input.structure === "low-wall" ? 85 : 10}
        fill={input.structure === "low-wall" ? STOCK.surface : accent}
        stroke={accent}
      />
      {input.structure === "low-wall" ? (
        <path
          d={`M200 305 H${200 + observedWidth} M200 335 H${200 + observedWidth}`}
          stroke={accent}
          opacity={0.4}
        />
      ) : (
        <path
          d={`M200 285 V360 M${200 + observedWidth} 285 V360`}
          stroke={accent}
          strokeWidth={6}
        />
      )}
      <MeasurementRuler />
    </g>
  );
}
