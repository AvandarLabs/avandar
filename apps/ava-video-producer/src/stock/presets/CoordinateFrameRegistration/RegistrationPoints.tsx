import { makeRegisteredLandmarksFromInputAndFrame } from "./makeRegisteredLandmarksFromInputAndFrame";
import { RegistrationReferences } from "./RegistrationReferences";
import type { Input } from "./CoordinateFrameRegistration.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Target rings are fixed physical references. Only coordinate copies register.
 */
export function RegistrationPoints({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const points = makeRegisteredLandmarksFromInputAndFrame({ input, frame });
  return (
    <g>
      <RegistrationReferences input={input} frame={frame} />
      {points.map((point) => (
        <circle
          key={point.id}
          data-landmark={point.id}
          data-target-x={point.targetX}
          data-target-y={point.targetY}
          cx={point.canvasX}
          cy={point.canvasY}
          r={5}
          fill={accent}
          fillOpacity={0.6}
          stroke={accent}
        />
      ))}
    </g>
  );
}
