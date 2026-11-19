import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./QualifyApparentConflict.schema";
import type { ReactNode } from "react";
/** Inputs for StatementContext. */
type Props = {
  frame: number;
  accent: string;
  statement: Input["statements"][number];
  index: number;
  contextY: number;
};

/** One original claim receives its own authored context label. */
export function StatementContext({
  frame,
  accent,
  statement,
  index,
  contextY,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <>
      <g
        {...{ [`data-context-${index}`]: true }}
        data-y={contextY}
        opacity={motion.ramp(frame, 60 + index * 4, motion.scale(24))}
      >
        <FitText
          text={statement.context}
          x={0}
          y={contextY}
          width={360}
          fontSize={16}
          maxLines={3}
          anchor="middle"
          color={index ? tokens.color.positive : accent}
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
