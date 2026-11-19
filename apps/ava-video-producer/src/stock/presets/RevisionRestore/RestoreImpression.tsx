import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./RevisionRestore.schema";
import type { ReactNode } from "react";

type Props = {
  revision: Input["revisions"][number];
  index: number;
  frame: number;
  accent: string;
};
/** A copy lifts from its retained snapshot and aligns over current contents. */
export function RestoreImpression({
  revision,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const progress = motion.ramp(frame, 60, motion.hero, motion.travel.easing);
  return (
    <g
      data-restoring-id={revision.id}
      opacity={
        motion.ramp(frame, 56, motion.whip) *
        (1 - motion.ramp(frame, 112, motion.scale(14)))
      }
    >
      <StockRect
        x={mix(progress, 40 + index * 225, 270)}
        y={mix(progress, 382, 140)}
        width={mix(progress, 205, 420)}
        height={mix(progress, 190, 200)}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        fillOpacity={0.22}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeDasharray="8 5"
      />
      {revision.content.map((line, lineIndex) => {
        return (
          <SketchedShape
            key={lineIndex}
            shape={{
              kind: "path",
              d: `M${mix(progress, 60 + index * 225, 294)} ${mix(progress, 433 + lineIndex * 43, 174 + lineIndex * 53)} h${Math.min(150, 20 + line.length * 4)}`,
            }}
            profile={tokens.sketch.shape}
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
            strokeOpacity={0.7}
          />
        );
      })}
    </g>
  );
}
