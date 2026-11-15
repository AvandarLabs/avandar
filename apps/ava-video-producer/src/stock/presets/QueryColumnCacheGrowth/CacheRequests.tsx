import { CacheRequestCards } from "./CacheRequestCards";
import { CacheRequestRoutes } from "./CacheRequestRoutes";
import { MissingCacheColumns } from "./MissingCacheColumns";
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
 * Covered and missing-column cues retain their exact reference associations.
 */
export function CacheRequests({
  input,
  scene,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <CacheRequestCards input={input} frame={frame} accent={accent} />
      <CacheRequestRoutes
        input={input}
        scene={scene}
        frame={frame}
        accent={accent}
      />
      {frame >= 61 && frame < 139 ? (
        <MissingCacheColumns input={input} missingIds={scene.missingIds} />
      ) : undefined}
      {input.showSetNotation ? (
        <text
          data-set-notation="true"
          x={60}
          y={32}
          fill={accent}
          fontSize={18}
        >
          {frame < 61 ? "R₁ ⊆ C" : frame < 106 ? "R₂ ∖ C" : "C ∪ R₂"}
        </text>
      ) : undefined}
    </g>
  );
}
