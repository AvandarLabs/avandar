import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getWorkPartitionFromInput } from "./getWorkPartitionFromInput";
import type { Input } from "./WorkDecomposition.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  pieces: ReturnType<typeof getWorkPartitionFromInput>;
  layout: Input["partitionLayout"];
  accent: string;
};
/** The cue the cuts fade out on, after every cut has drawn. */
const FADE_OUT_AT = 86;
/** Ruled boundaries traverse the still-continuous slab before separation. */
export function WorkCutLines({
  frame,
  pieces,
  layout,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g opacity={1 - motion.ramp(frame, FADE_OUT_AT, motion.scale(38))}>
      {pieces.slice(0, -1).map((piece, index) => {
        const vertical = layout === "strips" || index % 2 === 0;
        const cutAt = 38 + index * motion.scaleStagger(3);
        // Every cut finishes on the fade-out cue, so a later cut draws faster.
        const progress = motion.ramp(frame, cutAt, FADE_OUT_AT - cutAt);
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
