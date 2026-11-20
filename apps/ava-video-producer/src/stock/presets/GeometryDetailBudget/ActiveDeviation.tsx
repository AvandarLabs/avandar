import { DrawPath } from "../../graphics-common/DrawPath";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./GeometryDetailBudget.schema";
import type { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  event: ReturnType<typeof makeDetailSimplificationFromInput>["events"][number];
  frame: number;
  at: number;
  duration: number;
};
/** Current chord and perpendicular guide expose the evaluated recursion. */
export function ActiveDeviation({
  input,
  event,
  frame,
  at,
  duration,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const start = input.vertices[event.start];
  const end = input.vertices[event.end];
  const farthest = input.vertices[event.farthest];
  return (
    <g>
      <SketchedShape
        data-recursion-chord="active"
        data-active-segment={`${event.start}:${event.end}`}
        data-farthest-index={event.farthest}
        shape={{
          kind: "line",
          x1: 60 + start[0] * 3.6,
          y1: 160 + start[1] * 3.6,
          x2: 60 + end[0] * 3.6,
          y2: 160 + end[1] * 3.6,
        }}
        profile={sketch.shape}
        stroke={color.highlight}
        strokeDasharray={atomic.dash.wide.join(" ")}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      {input.showDeviationGuides ? (
        <DrawPath
          d={`M${60 + event.projection[0] * 3.6} ${160 + event.projection[1] * 3.6} L${60 + farthest[0] * 3.6} ${160 + farthest[1] * 3.6}`}
          frame={frame}
          at={at}
          duration={duration}
          color={color.highlight}
          width={stroke.default}
        />
      ) : undefined}
    </g>
  );
}
