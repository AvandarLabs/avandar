import { Motion } from "../../../../motion";
import { MarkerDot } from "./MarkerDot";
import type { cubicPoint } from "../../../graphics-common/cubicPoint";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  x: number;
  accent: string;
  branchId: string;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  branchId: Readonly<ParentProps>["branchId"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  point: ReturnType<typeof cubicPoint>;
  markerY: number | ReturnType<typeof cubicPoint>["y"];
};

const APPEAR_CUE = 12;

const APPEAR_FRAMES = 6;

/** Renders the decision marker marker branch in authored paint order. */
export function DecisionMarkerMarkerBranch(
  options: Readonly<Props>,
): ReactNode {
  return (
    <g
      data-marker-branch={options.branchId}
      opacity={Motion.ramp({
        frame: options.frame,
        at: APPEAR_CUE,
        dur: options.motion.scale(APPEAR_FRAMES),
        easing: options.motion.reveal.easing,
      })}
    >
      <MarkerDot
        x={options.point.x}
        y={options.markerY}
        accent={options.accent}
      />
    </g>
  );
}
