import { propEq } from "@avandar/utils";
import { ramp } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getCacheSceneFromFrame } from "../getCacheSceneFromFrame";
import type { Input } from "../QueryColumnCacheGrowth.schema";
import type { ReactNode } from "react";

type Props = Readonly<{
  input: Input;
  scene: ReturnType<typeof getCacheSceneFromFrame>;
  frame: number;
  accent: string;
}>;
const ROUTE_CUE = 13;
const ROUTE_FRAMES = 27;
/**
 * The route draws on as one dash over a path normalised to this length, so
 * it is geometry, not a theme dash.
 */
const DRAW_ON_LENGTH = 1;
/** Draws each covered request's route into its cached column. */
export function RequestedRoutes({
  input,
  scene,
  frame,
  accent,
}: Props): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps("QueryColumnCacheGrowth", {});
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { sketch } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const progress = ramp(
    frame,
    ROUTE_CUE,
    motion.scale(ROUTE_FRAMES),
    motion.travel.easing,
  );
  return input.requests[0].columnIds.map((id) => {
    const index = scene.original.findIndex(propEq("id", id)),
      x = 144 + index * 168;
    return (
      <g key={id} data-requested-column={id}>
        <SketchedShape
          shape={{ kind: "path", d: `M260 178 V225 H${x} V247` }}
          profile={sketch.shape}
          fill="none"
          stroke={accent}
          pathLength={DRAW_ON_LENGTH}
          strokeDasharray={DRAW_ON_LENGTH}
          strokeDashoffset={DRAW_ON_LENGTH * (1 - progress)}
          strokeWidth={scales.stroke(style.routeStrokeWidth)}
        />
        <SketchedShape
          shape={{ kind: "circle", cx: x, cy: 252, r: style.portRadius }}
          profile={sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(style.routeStrokeWidth)}
        />
      </g>
    );
  });
}
