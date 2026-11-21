import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LeakPipeShared } from "./LeakPipeShared";
import type { ReactNode } from "react";

type Props = {
  frame: number;
};
/** Water running through the pipe and out of the outlet. */
export function OutletFlow({ frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-outlet-flow="true">
      <SketchedShape
        shape={{ kind: "path", d: "M220 260 H735 V430" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(5)}
        strokeDasharray={LeakPipeShared.FLOW_DASH}
        strokeDashoffset={
          -Motion.loopPhase({
            frame,
            period: 48,
          }) * 48
        }
        fill="none"
      />
      <SketchedShape
        shape={{ kind: "path", d: "M720 440 h30" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}
