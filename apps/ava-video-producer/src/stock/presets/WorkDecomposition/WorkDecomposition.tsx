import { mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { getWorkPartitionFromInput } from "./getWorkPartitionFromInput";
import { WorkCutLines } from "./WorkCutLines";
import { WorkPiece } from "./WorkPiece";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./WorkDecomposition.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * A conserved slab becomes proportionally weighted, externally labeled
 * pieces.
 */
export function WorkDecomposition({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const separation = ramp(frame, 86, 38);
  const pieces = getWorkPartitionFromInput(input);
  const total = input.workItems.reduce((sum, item) => sum + item.effort, 0);
  return (
    <g opacity={ramp(frame, 12, 26)}>
      <rect
        data-original-slab="true"
        x={90}
        y={230}
        width={500}
        height={270}
        fill={accent}
        fillOpacity={0.16 * (1 - ramp(frame, 38, 2))}
        stroke={accent}
        strokeOpacity={0.25}
      />
      <path
        d="M66 222 V206 H614 V222 M66 508 V524 H614 V508"
        stroke={STOCK.line}
        fill="none"
      />
      <g opacity={ramp(frame, 38, 2)}>
        {pieces.map((piece, index) => (
          <WorkPiece
            key={piece.id}
            piece={piece}
            index={index}
            frame={frame}
            accent={accent}
            parentLabel={input.parentLabel}
            showEffortValues={input.showEffortValues}
          />
        ))}
      </g>
      <WorkCutLines
        frame={frame}
        pieces={pieces}
        layout={input.partitionLayout}
        accent={accent}
      />
      <FitText
        text={input.parentLabel}
        x={340}
        y={mix(separation, 340, 120)}
        width={540}
        fontSize={20}
        maxLines={2}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      <g opacity={separation}>
        <FitText
          text={input.groupingLabel}
          x={660}
          y={146}
          width={264}
          fontSize={16}
          maxLines={3}
          breakLongWords
          normalizeWhitespace
          color={accent}
        />
        <FitText
          text={input.unitLabel}
          x={340}
          y={564}
          width={400}
          fontSize={14}
          maxLines={1}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
        {input.showEffortValues ? (
          <FitText
            text={String(total)}
            x={100}
            y={564}
            width={60}
            fontSize={16}
            maxLines={1}
            normalizeWhitespace
            color={accent}
          />
        ) : undefined}
      </g>
    </g>
  );
}
