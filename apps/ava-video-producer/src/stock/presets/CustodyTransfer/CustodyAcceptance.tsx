import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ACCEPT_CUE, TRANSFER_CUE } from "./custodyShape";
import type { ReactNode } from "react";

type Props = { frame: number; accepted: boolean; accent: string };
/** Acknowledgement becomes visible before responsibility begins crossing. */
export function CustodyAcceptance({
  frame,
  accepted,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  return (
    <g
      opacity={
        accepted
          ? ramp(
              frame,
              ACCEPT_CUE,
              TRANSFER_CUE - ACCEPT_CUE,
              motion.reveal.easing,
            )
          : 0
      }
      data-acknowledgement="seal"
    >
      <SketchedShape
        shape={{ kind: "circle", cx: 900, cy: 230, r: 22 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M890 230 l7 8 15 -18" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}
