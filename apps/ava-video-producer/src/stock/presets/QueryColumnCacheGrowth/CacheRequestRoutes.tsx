import { propEq } from "@avandar/utils";
import { EASE, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { getCacheSceneFromFrame } from "./getCacheSceneFromFrame";
import type { Input } from "./QueryColumnCacheGrowth.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  scene: ReturnType<typeof getCacheSceneFromFrame>;
  frame: number;
  accent: string;
};
/**
 * Actual requested column identities own the coverage and missing-column
 * routes.
 */
export function CacheRequestRoutes({
  input,
  scene,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 13, 27, EASE.inOut);
  return (
    <g>
      {frame < 61
        ? input.requests[0].columnIds.map((id) => {
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
                />
                <circle cx={x} cy={252} r={5} fill="none" stroke={accent} />
              </g>
            );
          })
        : undefined}
      {frame >= 61 && frame < 139
        ? scene.missingIds.map((id, index) => (
            <path
              key={id}
              data-missing-route={id}
              d={`M700 178 V184 H${139 + index * 168} V191`}
              fill="none"
              stroke={STOCK.orange}
            />
          ))
        : undefined}
    </g>
  );
}
