import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SavedRevisionLines } from "./SavedRevisionLines";
import type { Input } from "./RevisionRestore.schema";
import type { ReactNode } from "react";

type Props = {
  revision: Input["revisions"][number];
  index: number;
  frame: number;
  selected: boolean;
  showLabel: boolean;
  accent: string;
};
/** A retained historical impression never moves when a copy is restored. */
export function SavedRevision({
  revision,
  index,
  frame,
  selected,
  showLabel,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const x = 40 + index * 225;
  return (
    <g opacity={motion.reveal(frame, 16 + index * motion.scaleStagger(3))}>
      <StockRect
        data-history-id={revision.id}
        x={x}
        y={382}
        width={205}
        height={190}
        rx={scales.corner(9)}
        fill={tokens.color.surface}
        stroke={selected ? accent : tokens.color.line}
        strokeWidth={scales.stroke(
          selected ? tokens.stroke.default : tokens.stroke.hairline,
        )}
      />
      {showLabel ? (
        <FitText
          text={revision.label}
          x={x + 10}
          y={403}
          width={185}
          maxLines={2}
          fontSize={12}
          normalizeWhitespace
          breakLongWords
          color={selected ? accent : tokens.color.text}
        />
      ) : undefined}
      <SavedRevisionLines content={revision.content} x={x} />
    </g>
  );
}
