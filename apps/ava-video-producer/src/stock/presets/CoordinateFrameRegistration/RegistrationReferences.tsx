import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { makeRegisteredLandmarksFromInputAndFrame } from "./makeRegisteredLandmarksFromInputAndFrame";
import type { Input } from "./CoordinateFrameRegistration.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };

const LEADER_DASH = "3 4";
const SOURCE_GHOST_ALPHA = 0.3;
/**
 * Fixed target rings and source ghosts preserve the physical reference sites.
 */
export function RegistrationReferences({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const hairline = shapes.stroke(stroke.hairline);
  const points = makeRegisteredLandmarksFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      {" "}
      {points.map((point) => {
        return (
          <g key={point.id}>
            <SketchedShape
              shape={{
                kind: "path",
                d: `M${555 + point.targetX * 2.4} ${185 + point.targetY * 2.4} L${54 + point.index * 220} 432`,
              }}
              profile={sketch.shape}
              stroke={color.line}
              strokeDasharray={LEADER_DASH}
              fill="none"
              strokeWidth={hairline}
            />
            <SketchedShape
              data-stationary-target={point.id}
              shape={{
                kind: "circle",
                cx: 555 + point.targetX * 2.4,
                cy: 185 + point.targetY * 2.4,
                r: 10 + point.index * 2,
              }}
              profile={sketch.shape}
              fill="none"
              stroke={color.positive}
              strokeWidth={hairline}
            />
            <circle
              cx={65 + point.x * 2.4}
              cy={185 + point.y * 2.4}
              r={5}
              fill={color.inactive}
              fillOpacity={SOURCE_GHOST_ALPHA}
            />
          </g>
        );
      })}
    </g>
  );
}
