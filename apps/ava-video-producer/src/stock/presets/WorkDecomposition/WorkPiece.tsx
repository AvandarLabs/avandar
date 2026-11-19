import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getWorkPartitionFromInput } from "./getWorkPartitionFromInput";
import type { ReactNode } from "react";

type Props = {
  piece: ReturnType<typeof getWorkPartitionFromInput>[number];
  index: number;
  frame: number;
  accent: string;
  parentLabel: string;
  showEffortValues: boolean;
};
/** How strongly a piece's leader line to its label shows. */
const LEADER_OPACITY = 0.45;
/** The tint of a work piece, before the theme's tint strength. */
const PIECE_TINT = 0.16;
/** Preserve piece area while separating cuts and attaching external labels. */
export function WorkPiece({
  piece,
  index,
  frame,
  accent,
  parentLabel,
  showEffortValues,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const separation = motion.ramp(frame, 86, motion.scale(38));
  const x = piece.x + piece.shiftX * separation,
    y = piece.y + piece.shiftY * separation;
  const labelY = 222 + index * 56;
  const color = index % 2 === 0 ? accent : tokens.color.accentAlt;
  return (
    <g>
      <StockRect
        data-piece-id={piece.id}
        data-parent={parentLabel}
        x={x}
        y={y}
        width={piece.width}
        height={piece.height}
        fill={color}
        fillOpacity={scales.wash(PIECE_TINT)}
        stroke={tokens.color.ground}
        strokeWidth={scales.stroke(separation * tokens.stroke.default)}
      />
      <g opacity={separation}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x + piece.width / 2} ${y + piece.height / 2} L624 ${labelY - 5} H646`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={color}
          strokeOpacity={LEADER_OPACITY}
        />
        <circle
          cx={x + piece.width / 2}
          cy={y + piece.height / 2}
          r={3}
          fill={color}
        />
        <FitText
          text={piece.label}
          x={660}
          y={labelY}
          width={264}
          fontSize={14}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
        />
        {showEffortValues ? (
          <FitText
            text={String(piece.effort)}
            x={640}
            y={labelY + 17}
            width={26}
            fontSize={12}
            maxLines={1}
            anchor="end"
            normalizeWhitespace
            color={color}
          />
        ) : undefined}
      </g>
    </g>
  );
}
