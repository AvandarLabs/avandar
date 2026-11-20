import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CleanupHeadings } from "./CleanupHeadings";
import { CleanupRow } from "./CleanupRow";
import { RAIL_CUE, RAIL_FRAMES } from "./cleanupTiming";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";
/** Complete cleanup props. The shared renderer owns the loop envelope. */
export type Props = GraphicProps & { input: Input };

/** The rail's normalized path length, which its draw-on dash spans. */
const RAIL_LENGTH = 1;
/** Replace authored changed cells and retain the exact original-value rail. */
export function CellNormalization({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <CleanupHeadings input={input} frame={frame} accent={accent} />
      <OriginalValueRail frame={frame} input={input} accent={accent} />
      {input.rows.map((row, index) => {
        return (
          <CleanupRow
            key={row.id}
            row={row}
            index={index}
            frame={frame}
            input={input}
            accent={accent}
          />
        );
      })}
    </g>
  );
}

/** The rail beside or across the rows that keeps the original values. */
function OriginalValueRail({
  frame,
  input,
  accent,
}: Readonly<Pick<Props, "frame" | "input" | "accent">>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const rail = ramp(
    frame,
    RAIL_CUE,
    motion.scale(RAIL_FRAMES),
    motion.reveal.easing,
  );
  return (
    <g data-original-rail={input.comparison} opacity={rail}>
      <SketchedShape
        shape={{
          kind: "path",
          d: input.comparison === "side-rail" ? "M496 132V584" : "M64 132H896",
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
        pathLength={RAIL_LENGTH}
        strokeDasharray={RAIL_LENGTH}
        strokeDashoffset={RAIL_LENGTH * (1 - rail)}
      />
    </g>
  );
}
