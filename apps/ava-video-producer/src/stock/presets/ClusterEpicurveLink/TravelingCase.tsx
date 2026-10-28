import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { getCasePositionsFromInput } from "./getCasePositionsFromInput";
import type { ReactNode } from "react";

type Props = {
  position: ReturnType<typeof getCasePositionsFromInput>[number];
  frame: number;
  accent: string;
  showGuide: boolean;
};
/**
 * A numbered copy rises along its identity guide without implying transmission.
 */
export function TravelingCase({
  position,
  frame,
  accent,
  showGuide,
}: Readonly<Props>): ReactNode {
  const { record, index, mapX, mapY, histogramX, histogramY } = position;
  const progress = ramp(frame, 36, 48, EASE.inOut);
  const x = mix(progress, mapX, histogramX);
  const y =
    mix(progress, mapY, histogramY - 6) - 18 * Math.sin(progress * Math.PI);
  return (
    <g>
      {showGuide ? (
        <line
          data-identity-guide={record.id}
          x1={mapX}
          y1={mapY}
          x2={histogramX}
          y2={histogramY - 6}
          stroke={accent}
          strokeOpacity={0.45}
          strokeDasharray="3 5"
        />
      ) : undefined}
      <circle
        data-lifted-case={record.id}
        cx={x}
        cy={y}
        r={9}
        fill={STOCK.surface}
        stroke={accent}
      />
      <text x={x} y={y + 4} fill={STOCK.text} textAnchor="middle" fontSize={12}>
        {index + 1}
      </text>
    </g>
  );
}
