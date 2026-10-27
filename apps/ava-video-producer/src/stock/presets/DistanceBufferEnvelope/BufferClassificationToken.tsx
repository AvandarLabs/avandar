import { ramp, EASE } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getBufferTransferPointFromLocation } from "./getBufferTransferPointFromLocation";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  location: Input["locations"][number];
  index: number;
  ledgerIndex: number;
  frame: number;
  accent: string;
};
/**
 * Only qualifying tokens enter the ledger and display their stable source key.
 */
export function BufferClassificationToken({
  input,
  location,
  index,
  ledgerIndex,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 106 + index * 2, 23, EASE.inOut);
  const point = getBufferTransferPointFromLocation({
    location,
    ledgerIndex,
    progress,
  });
  const included =
    Math.hypot(location.x - input.origin.x, location.y - input.origin.y) <=
    input.radiusUnits;
  return included ? (
    <g>
      <circle
        data-ledger-token={location.id}
        data-included-id={frame >= 139 ? location.id : undefined}
        cx={point.x}
        cy={point.y}
        r={8}
        fill={accent}
      />
      {progress === 1 ? (
        <text
          x={point.x}
          y={point.y + 4}
          fontSize={12}
          textAnchor="middle"
          fill={STOCK.ground}
        >
          {index + 1}
        </text>
      ) : undefined}
    </g>
  ) : undefined;
}
