import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const { atomic } = useGraphicTheme();
  const { stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const points = makeRegisteredLandmarksFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      <RegistrationReferences input={input} frame={frame} />
      {points.map((point) => {
        return (
          <SketchedShape
            key={point.id}
            data-landmark={point.id}
            data-target-x={point.targetX}
            data-target-y={point.targetY}
            shape={{
              kind: "circle",
              cx: point.canvasX,
              cy: point.canvasY,
              r: 5,
            }}
            profile={sketch.shape}
            fill={accent}
            fillOpacity={atomic.opacity["60"]}
            stroke={accent}
            strokeWidth={shapes.stroke(stroke.hairline)}
          />
        );
      })}
    </g>
  );
}
