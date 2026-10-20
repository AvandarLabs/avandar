import { FitText } from "../../primitives/FitText/FitText";
import { CleanupComparisonHeading } from "./CleanupComparisonHeading";
import { CleanupPrimaryHeading } from "./CleanupPrimaryHeading";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Headings follow the displayed value type, comparison mode and timeline. */
export function CleanupHeadings({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.title}
        x={64}
        y={54}
        width={830}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <CleanupPrimaryHeading input={input} frame={frame} accent={accent} />
      <CleanupComparisonHeading input={input} frame={frame} />
    </g>
  );
}
