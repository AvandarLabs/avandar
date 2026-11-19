import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { frame: number; accent: string };
/** The lid opens before the authored stock leaves the carrier. */
export function SessionCarrier({ frame, accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: "M35 195 V430 H245 V195" }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <g data-carrier-lid="opening">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M35 195 L${mix(motion.ramp(frame, 16, motion.scale(20), motion.entrance.easing), 245, 200)} ${mix(motion.ramp(frame, 16, motion.scale(20), motion.entrance.easing), 195, 155)}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      </g>
    </g>
  );
}
