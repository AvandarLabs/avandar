import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};
const VERTEX_AT = 13;
const VERTEX_FRAMES = 23;
const KEPT_AT = 111;
const KEPT_FRAMES = 28;
/**
 * All source vertices stay fixed, including removed and backtracking vertices.
 */
export function SourceVertices({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { color } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const keptT = motion.ramp(frame, KEPT_AT, motion.scale(KEPT_FRAMES));
  const { keptIndices } = makeDetailSimplificationFromInput(input);
  const kept = new Set(keptIndices);
  return (
    <g>
      {input.vertices.map(([x, y], index) => {
        return (
          <circle
            key={index}
            data-source-vertex={index}
            data-kept-index={kept.has(index) ? index : undefined}
            cx={60 + x * 3.6}
            cy={160 + y * 3.6}
            r={5}
            fill={
              kept.has(index)
                ? Motion.mixToken({
                    t: keptT,
                    from: color.inactive,
                    to: accent,
                  })
                : color.inactive
            }
            opacity={motion.ramp(
              frame,
              VERTEX_AT + index * motion.stagger.list,
              motion.scale(VERTEX_FRAMES),
            )}
          />
        );
      })}
    </g>
  );
}
