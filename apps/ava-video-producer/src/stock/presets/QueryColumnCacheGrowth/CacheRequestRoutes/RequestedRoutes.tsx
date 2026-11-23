import { propEq } from "@avandar/utils";
import { ramp } from "../../../../motion";
import {
  useGraphicMotion,
  useGraphicProps,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
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

/** Draws each covered request's route into its cached column. */
export function RequestedRoutes({
  input,
  scene,
  frame,
  accent,
}: Props): ReactNode {
  const style = useGraphicProps("QueryColumnCacheGrowth", {});
  const motion = useGraphicMotion();
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
        <path
          d={`M260 178 V225 H${x} V247`}
          fill="none"
          stroke={accent}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
          strokeWidth={style.routeStrokeWidth}
        />
        <circle
          cx={x}
          cy={252}
          r={style.portRadius}
          fill="none"
          stroke={accent}
          strokeWidth={style.routeStrokeWidth}
        />
      </g>
    );
  });
}
