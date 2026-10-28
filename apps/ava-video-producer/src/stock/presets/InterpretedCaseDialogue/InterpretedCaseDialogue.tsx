import { DialogueBubble } from "./DialogueBubble";
import { DialogueLegend } from "./DialogueLegend";
import { DialoguePeople } from "./DialoguePeople";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./InterpretedCaseDialogue.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Two authored dialogue turns preserve attribution across supplied wordings.
 */
export function InterpretedCaseDialogue({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <DialogueLegend input={input} accent={accent} />{" "}
      <DialoguePeople input={input} frame={frame} accent={accent} />
      {input.turns.map((turn, turnIndex) => (
        <g key={turn.id}>
          <DialogueBubble
            input={input}
            frame={frame}
            turnIndex={turnIndex}
            interpreted={false}
            accent={accent}
          />
          <DialogueBubble
            input={input}
            frame={frame}
            turnIndex={turnIndex}
            interpreted
            accent={accent}
          />
        </g>
      ))}
    </g>
  );
}
