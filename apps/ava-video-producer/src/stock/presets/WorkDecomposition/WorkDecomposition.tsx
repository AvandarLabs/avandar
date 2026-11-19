import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getWorkPartitionFromInput } from "./getWorkPartitionFromInput";
import { WorkCutLines } from "./WorkCutLines";
import { WorkPiece } from "./WorkPiece";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const separation = motion.ramp(frame, 86, motion.scale(38));
  const pieces = getWorkPartitionFromInput(input);
  const total = input.workItems.reduce((sum, item) => {
    return sum + item.effort;
  }, 0);
  return (
    <g opacity={motion.ramp(frame, 12, motion.scale(26))}>
      <StockRect
        data-original-slab="true"
        x={90}
        y={230}
        width={500}
        height={270}
        fill={accent}
        fillOpacity={0.16 * (1 - motion.ramp(frame, 38, motion.scale(2)))}
        stroke={accent}
        strokeOpacity={tokens.alpha.ghost}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M66 222 V206 H614 V222 M66 508 V524 H614 V508",
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        fill="none"
      />
      <g opacity={motion.ramp(frame, 38, motion.scale(2))}>
        {pieces.map((piece, index) => {
          return (
            <WorkPiece
              key={piece.id}
              piece={piece}
              index={index}
              frame={frame}
              accent={accent}
              parentLabel={input.parentLabel}
              showEffortValues={input.showEffortValues}
            />
          );
        })}
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
