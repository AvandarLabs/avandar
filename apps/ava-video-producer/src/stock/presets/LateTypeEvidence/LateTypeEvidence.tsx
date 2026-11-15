import { STOCK } from "../../stockPalette";
import { EvidenceCells } from "./EvidenceCells";
import { TypeEvidenceHeadings } from "./TypeEvidenceHeadings";
import { TypeReviewBracket } from "./TypeReviewBracket";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./LateTypeEvidence.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Type decisions retain every source string and never imply numeric safety. */
export function LateTypeEvidence({
  input,
  frame,
  accent,
  background,
}: Readonly<Props>): ReactNode {
  const isResolved = frame >= 139;
  const isWidened = input.policy === "widen-to-text";
  return (
    <g
      data-column-type={
        isResolved ? (isWidened ? "text" : "review") : "provisional"
      }
      data-import-completed={isResolved && isWidened}
    >
      <EvidenceCells
        input={input}
        frame={frame}
        accent={accent}
        background={background ?? STOCK.ground}
      />
      <TypeReviewBracket input={input} frame={frame} />
      <TypeEvidenceHeadings input={input} frame={frame} />
    </g>
  );
}
