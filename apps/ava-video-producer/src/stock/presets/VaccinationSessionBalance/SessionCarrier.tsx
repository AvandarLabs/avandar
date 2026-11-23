import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
};

type GetSessionSupplyRouteOptions = {
  frame: Readonly<Props>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

/** Samples the session supply route for the current authored frame. */
function _getSessionSupplyRoute({
  frame,
  motion,
}: Readonly<GetSessionSupplyRouteOptions>): { kind: "path"; d: string } {
  return {
    kind: "path",
    d: `M35 195 L${Motion.mix({
      t: motion.ramp(frame, 16, motion.scale(20), motion.entrance.easing),
      from: 245,
      to: 200,
    })} ${Motion.mix({
      t: motion.ramp(frame, 16, motion.scale(20), motion.entrance.easing),
      from: 195,
      to: 155,
    })}`,
  };
}

/** The lid opens before the authored stock leaves the carrier. */
export function SessionCarrier({ frame, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
          shape={_getSessionSupplyRoute({ frame, motion })}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      </g>
    </g>
  );
}
