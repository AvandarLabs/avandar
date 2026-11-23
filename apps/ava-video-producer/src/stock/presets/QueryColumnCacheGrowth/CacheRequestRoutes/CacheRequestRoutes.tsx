import { MissingRoutes } from "./MissingRoutes";
import { RequestedRoutes } from "./RequestedRoutes";
import type { getCacheSceneFromFrame } from "../getCacheSceneFromFrame";
import type { Input } from "../QueryColumnCacheGrowth.schema";
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
  return (
    <g>
      {frame < 61 ? (
        <RequestedRoutes
          input={input}
          scene={scene}
          frame={frame}
          accent={accent}
        />
      ) : undefined}
      {frame >= 61 && frame < 139 ? (
        <MissingRoutes missingIds={scene.missingIds} />
      ) : undefined}
    </g>
  );
}
