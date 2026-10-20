import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { CachedRelation } from "./CachedRelation";
import { CacheRequests } from "./CacheRequests";
import { getCacheSceneFromFrame } from "./getCacheSceneFromFrame";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./QueryColumnCacheGrowth.schema";
import type { ReactNode } from "react";
/** Inputs for QueryColumnCacheGrowth. */
type Props = GraphicProps & { input: Input };

/**
 * Column containment grows one retained relation without changing row grain.
 */
export function QueryColumnCacheGrowth({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const scene = getCacheSceneFromFrame({ frame, input });
  return (
    <g>
      <CacheRequests
        input={input}
        scene={scene}
        frame={frame}
        accent={accent}
      />
      <CachedRelation
        input={input}
        scene={scene}
        frame={frame}
        accent={accent}
      />
      <LabelSlots
        labels={[
          [input.copy.context, 60, 580, 840, 14, 1],
          [
            frame >= 140 ? input.copy.after : input.copy.before,
            250,
            30,
            650,
            14,
            2,
          ],
        ]}
      />
    </g>
  );
}
