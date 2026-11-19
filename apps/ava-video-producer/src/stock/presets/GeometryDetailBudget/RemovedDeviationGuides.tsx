import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };

const GUIDES_AT = 111;
const GUIDES_FRAMES = 28;
const GUIDE_DASH = "3 3";
/** Each removed point is paired with its own finite retained segment. */
export function RemovedDeviationGuides({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const { removed } = makeDetailSimplificationFromInput(input);
  return (
    <g>
      {removed.map((item) => {
        return (
          <SketchedShape
            key={item.index}
            data-removed-index={item.index}
            data-distance={item.distance}
            shape={{
              kind: "line",
              x1: 60 + input.vertices[item.index][0] * 3.6,
              y1: 160 + input.vertices[item.index][1] * 3.6,
              x2: 60 + item.projection[0] * 3.6,
              y2: 160 + item.projection[1] * 3.6,
            }}
            profile={sketch.shape}
            stroke={color.highlight}
            strokeDasharray={GUIDE_DASH}
            strokeWidth={shapes.stroke(stroke.hairline)}
            opacity={motion.ramp(frame, GUIDES_AT, motion.scale(GUIDES_FRAMES))}
          />
        );
      })}
    </g>
  );
}
