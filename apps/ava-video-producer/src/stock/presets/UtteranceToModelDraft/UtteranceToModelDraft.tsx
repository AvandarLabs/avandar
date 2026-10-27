import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { DraftModel } from "./DraftModel";
import { DraftReview } from "./DraftReview";
import { SourceSentence } from "./SourceSentence";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./UtteranceToModelDraft.schema";
import type { ReactNode } from "react";
/** Frame-driven authored mapping and supplied review state. */
export type Props = GraphicProps & { input: Input };
/** Lifts authored phrase copies without changing their source sentence. */
export function UtteranceToModelDraft({
  frame,
  input,
  accent,
  background = STOCK.ground,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <DraftModel frame={frame} input={input} accent={accent} />
      <rect
        data-draft-caption-backing="true"
        x={44}
        y={208}
        width={896}
        height={48}
        fill={background}
      />
      <LabelSlots
        labels={[
          [input.copy.source, 60, 45, 840, 16, 2],
          [input.copy.draft, 60, 230, 840, 16, 2],
          [input.copy.example, 60, 75, 840, 12, 2],
        ]}
      />
      <SourceSentence
        frame={frame}
        input={input}
        accent={accent}
        background={background}
      />
      <DraftReview frame={frame} input={input} accent={accent} />
    </g>
  );
}
