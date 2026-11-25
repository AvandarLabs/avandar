import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PushdownRow } from "../PushdownRow";
import type { Input } from "../PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

const GATE_CUE = 51;
const GATE_FRAMES = 44;
type Props = Readonly<{
  frame: number;
  row: Input["rows"][number];
  index: number;
  isRejected: boolean;
  accent: string;
}>;
/**
 * An original row, with a gate closing in front of it when the predicate
 * rejects it.
 */
export function PushdownSourceRow({
  frame,
  row,
  index,
  isRejected,
  accent,
}: Props): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "PredicatePushdownBoundary",
    props: {},
  });
  const { color, sketch } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const gates = Motion.ramp({
    frame,
    at: GATE_CUE,
    dur: motion.scale(GATE_FRAMES),
    easing: motion.travel.easing,
  });
  return (
    <g>
      <PushdownRow
        row={row}
        x={64}
        y={246 + index * 32}
        source
        accent={accent}
      />
      {isRejected ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${438 - 18 * gates} ${228 + index * 32} v32`,
          }}
          profile={sketch.shape}
          data-gate={row.id}
          stroke={color.highlight}
          strokeWidth={scales.stroke(style.gateWidth)}
        />
      ) : undefined}
    </g>
  );
}
