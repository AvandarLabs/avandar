import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EvidenceCells } from "./EvidenceCells";
import { RESOLVED_CUE } from "./evidenceTiming";
import { TypeEvidenceHeadings } from "./TypeEvidenceHeadings";
import { TypeReviewBracket } from "./TypeReviewBracket";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const isResolved = frame >= RESOLVED_CUE;
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
        background={background ?? tokens.color.ground}
      />
      <TypeReviewBracket input={input} frame={frame} />
      <TypeEvidenceHeadings input={input} frame={frame} />
    </g>
  );
}
