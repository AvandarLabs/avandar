import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getWorkPartitionFromInput } from "./getWorkPartitionFromInput";
import type { Input } from "./WorkDecomposition.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  pieces: ReturnType<typeof getWorkPartitionFromInput>;
  layout: Input["partitionLayout"];
  accent: string;
};
/** Ruled boundaries traverse the still-continuous slab before separation. */
export function WorkCutLines({
  frame,
  pieces,
  layout,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g opacity={1 - motion.ramp(frame, 86, motion.scale(38))}>
      {pieces.slice(0, -1).map((piece, index) => {
        const vertical = layout === "strips" || index % 2 === 0;
        const progress = motion.ramp(frame, 38 + index * 3, 48 - index * 3);
        const x = piece.x + (vertical ? piece.width : 0),
          y = piece.y + (vertical ? 0 : piece.height);
        return (
          <SketchedShape
            key={piece.id}
            shape={{
              kind: "line",
              x1: x,
              y1: y,
              x2: x + (vertical ? 0 : piece.width * progress),
              y2: y + (vertical ? piece.height * progress : 0),
            }}
            profile={tokens.sketch.shape}
            data-cut-index={index}
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.default)}
          />
        );
      })}
    </g>
  );
}
