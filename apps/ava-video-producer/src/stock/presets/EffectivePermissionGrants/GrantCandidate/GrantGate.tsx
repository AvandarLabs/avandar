import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  grantId: string;
  x: number;
  y: number;
  closure: number;
  frame: number;
};
/** The eligibility gate that closes across an excluded grant. */
export function GrantGate({
  grantId,
  x,
  y,
  closure,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g data-grant-gate={grantId}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x - 20} ${y - 21} v42 M${x - 20} ${y} h${40 * closure}`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
        opacity={Motion.ramp({
          frame,
          at: 53,
          dur: motion.whip,
          easing: motion.reveal.easing,
        })}
      />
    </g>
  );
}
