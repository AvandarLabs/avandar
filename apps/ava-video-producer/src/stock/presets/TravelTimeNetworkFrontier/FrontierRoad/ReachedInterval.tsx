import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  roadId: string;
  source: Readonly<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>;
  start: number;
  end: number;
  accent: string;
};
/** One reached stretch of the road, between two fractions of its length. */
export function ReachedInterval({
  roadId,
  source,
  start,
  end,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-frontier-road={roadId}>
      <SketchedShape
        shape={{
          kind: "line",
          x1: Motion.mix({
            t: start,
            from: source.x1,
            to: source.x2,
          }),
          y1: Motion.mix({
            t: start,
            from: source.y1,
            to: source.y2,
          }),
          x2: Motion.mix({
            t: end,
            from: source.x1,
            to: source.x2,
          }),
          y2: Motion.mix({
            t: end,
            from: source.y1,
            to: source.y2,
          }),
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(5)}
        strokeLinecap="round"
      />
    </g>
  );
}
