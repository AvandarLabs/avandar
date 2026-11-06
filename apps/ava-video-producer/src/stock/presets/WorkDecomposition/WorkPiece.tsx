import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
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
/** Preserve piece area while separating cuts and attaching external labels. */
export function WorkPiece({
  piece,
  index,
  frame,
  accent,
  parentLabel,
  showEffortValues,
}: Readonly<Props>): ReactNode {
  const separation = ramp(frame, 86, 38);
  const x = piece.x + piece.shiftX * separation,
    y = piece.y + piece.shiftY * separation;
  const labelY = 222 + index * 56;
  const color = index % 2 === 0 ? accent : STOCK.cyan;
  return (
    <g>
      <rect
        data-piece-id={piece.id}
        data-parent={parentLabel}
        x={x}
        y={y}
        width={piece.width}
        height={piece.height}
        fill={color}
        fillOpacity={0.16}
        stroke={STOCK.ground}
        strokeWidth={separation * 2}
      />
      <g opacity={separation}>
        <path
          d={`M${x + piece.width / 2} ${y + piece.height / 2} L624 ${labelY - 5} H646`}
          fill="none"
          stroke={color}
          strokeOpacity={0.45}
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
