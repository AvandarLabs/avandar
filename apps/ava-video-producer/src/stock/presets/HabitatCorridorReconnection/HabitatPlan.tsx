import { getRoutePointFromProgress } from "../../primitives/RoutePath/getRoutePointFromProgress";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { HabitatCrossingClearance } from "./HabitatCrossingClearance/HabitatCrossingClearance";
import { HabitatPatchLabels } from "./HabitatPatchLabels/HabitatPatchLabels";
import { HabitatPlanCorridorRoute } from "./HabitatPlanCorridorRoute/HabitatPlanCorridorRoute";
import { HabitatPlanIllustrativeTraversal } from "./HabitatPlanIllustrativeTraversal/HabitatPlanIllustrativeTraversal";
import { makeCorridorRouteFromInputAndFrame } from "./makeCorridorRouteFromInputAndFrame";
import type { Input } from "./HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";

type HabitatCorridorState = {
  path: string;
  laid: number;
  crossing: number;
  marker: ReturnType<typeof getRoutePointFromProgress>;
};

/** Inputs for HabitatPlan. */
type Props = {
  frame: number;
  accent: string;
  background?: string;
  input: Input;
};
const ROAD_LINE_DASH = "7 5";
const PATCH_RADIUS_X = 100;
const PATCH_RADIUS_Y = 62;

type GetHabitatCorridorStateOptions = {
  frame: number;
  input: Input;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Samples the authored habitat corridor state. */
function _getHabitatCorridorState({
  frame,
  input,
  motion,
}: Readonly<GetHabitatCorridorStateOptions>): HabitatCorridorState {
  const { points, path } = makeCorridorRouteFromInputAndFrame({
    motion,
    input,
    frame,
  });
  const laid = motion.ramp(frame, 36, motion.scale(22), motion.travel.easing),
    crossing = motion.ramp(frame, 58, motion.scale(20), motion.travel.easing);
  const marker = getRoutePointFromProgress({
    points: points.map((point) => {
      return { x: point.x / 960, y: point.y / 960 };
    }),
    progress: motion.ramp(frame, 82, motion.scale(26), motion.travel.easing),
  });
  return { path, laid, crossing, marker };
}

/**
 * The complete outline or solid route crosses the road before optional
 * illustrative travel.
 */
export function HabitatPlan({
  frame,
  accent,
  background: backgroundColor,
  input,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const background = backgroundColor ?? tokens.color.ground;
  const { path, laid, crossing, marker } = _getHabitatCorridorState({
    frame,
    input,
    motion,
  });
  return (
    <g>
      <rect x={462} y={225} width={36} height={145} fill={tokens.color.line} />
      <SketchedShape
        shape={{ kind: "path", d: "M 480 225 V 370" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeDasharray={ROAD_LINE_DASH}
        fill="none"
      />
      <HabitatPatchLabels
        input={input}
        patchRadiusX={PATCH_RADIUS_X}
        patchRadiusY={PATCH_RADIUS_Y}
        {...{ tokens, accent, scales, atomic }}
      />
      <HabitatCrossingClearance
        {...{ path, tokens, background, scales, crossing }}
      />
      <HabitatPlanCorridorRoute
        {...{ laid, path, tokens, accent, scales, input, background }}
        crossing={crossing}
      />
      <HabitatPlanIllustrativeTraversal
        {...{ input, frame, marker, tokens, background, scales }}
      />
    </g>
  );
}
/** The type of `PATCH_RADIUS_X` used by HabitatPlan. */
export type HabitatPlanPatchRadiusXValue = typeof PATCH_RADIUS_X;

/** The type of `PATCH_RADIUS_Y` used by HabitatPlan. */
export type HabitatPlanPatchRadiusYValue = typeof PATCH_RADIUS_Y;
