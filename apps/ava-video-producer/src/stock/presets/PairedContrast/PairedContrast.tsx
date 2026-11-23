import { ContrastAlternative } from "./ContrastAlternative/ContrastAlternative";
import { ContrastHeading } from "./ContrastHeading";
import { ContrastRow } from "./ContrastRow/ContrastRow";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./PairedContrast.schema";
import type { ReactNode } from "react";
/** Frame-controlled paired comparison and complete authored content. */
export type Props = GraphicProps & { input: Input };
/** Equal alternatives separate around one shared authored question. */
export function PairedContrast({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ContrastHeading frame={frame} input={input} />
      {input.alternatives.map((alternative, index) => {
        return (
          <ContrastAlternative
            key={alternative.id}
            {...{ alternative, index, frame, accent }}
          />
        );
      })}
      {input.criteria.map((row, index) => {
        return (
          <ContrastRow
            key={row.id}
            {...{ row, index, frame, accent }}
            isFocused={row.id === input.focusCriterionId}
            showBrackets={input.showPairBrackets}
          />
        );
      })}
    </g>
  );
}
