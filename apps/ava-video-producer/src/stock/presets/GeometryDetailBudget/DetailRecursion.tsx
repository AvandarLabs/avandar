import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ActiveDeviation } from "./ActiveDeviation";
import { makeCompletedDetailPathFromInputAndFrame } from "./makeCompletedDetailPathFromInputAndFrame";
import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import { RecursiveSplit } from "./RecursiveSplit";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
const RECURSION_AT = 51;
/**
 * Recursive splits retain their completed trace through the final highlight.
 */
export function DetailRecursion({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { events } = makeDetailSimplificationFromInput(input);
  const span = 60 / events.length;
  const activeIndex = Math.min(
    events.length - 1,
    Math.floor(Math.max(0, frame - 51) / span),
  );
  const event = events[activeIndex];
  if (frame < 51 || !event) {
    return undefined;
  }
  const path = makeCompletedDetailPathFromInputAndFrame({ input, frame });
  return (
    <g>
      <SketchedShape
        data-recursive-trace="retained"
        shape={{ kind: "path", d: path }}
        profile={sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={shapes.stroke(stroke.default)}
        opacity={motion.ramp(frame, RECURSION_AT, motion.chip)}
      />
      {frame < 111 ? (
        <ActiveDeviation
          input={input}
          event={event}
          frame={frame}
          at={51 + activeIndex * span}
          duration={span}
        />
      ) : undefined}
      {frame < 111 && event.split ? (
        <RecursiveSplit
          input={input}
          event={event}
          frame={frame}
          at={51 + activeIndex * span}
          duration={span}
          accent={accent}
        />
      ) : undefined}
    </g>
  );
}
