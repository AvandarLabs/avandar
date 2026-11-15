import { STOCK } from "../../stockPalette";
import { makeRegisteredLandmarksFromInputAndFrame } from "./makeRegisteredLandmarksFromInputAndFrame";
import type { Input } from "./CoordinateFrameRegistration.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * Fixed target rings and source ghosts preserve the physical reference sites.
 */
export function RegistrationReferences({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const points = makeRegisteredLandmarksFromInputAndFrame({ input, frame });
  return (
    <g>
      {" "}
      {points.map((point) => (
        <g key={point.id}>
          <path
            d={`M${555 + point.targetX * 2.4} ${185 + point.targetY * 2.4} L${54 + point.index * 220} 432`}
            stroke={STOCK.line}
            strokeDasharray="3 4"
            fill="none"
          />
          <circle
            data-stationary-target={point.id}
            cx={555 + point.targetX * 2.4}
            cy={185 + point.targetY * 2.4}
            r={10 + point.index * 2}
            fill="none"
            stroke={STOCK.mint}
          />
          <circle
            cx={65 + point.x * 2.4}
            cy={185 + point.y * 2.4}
            r={5}
            fill={STOCK.muted}
            fillOpacity={0.3}
          />
        </g>
      ))}
    </g>
  );
}
