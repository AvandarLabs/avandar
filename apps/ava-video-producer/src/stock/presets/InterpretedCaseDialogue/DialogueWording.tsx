import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./InterpretedCaseDialogue.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  turnIndex: number;
  interpreted: boolean;
  x: number;
  y: number;
};
/** Speaker, authored language and exact wording share one readable bubble. */
export function DialogueWording({
  input,
  turnIndex,
  interpreted,
  x,
  y,
}: Readonly<Props>): ReactNode {
  const turn = input.turns[turnIndex];
  const language = interpreted
    ? turn.speaker === "participant"
      ? input.languages.worker
      : input.languages.participant
    : input.languages[turn.speaker];
  return (
    <LabelSlots
      labels={[
        [
          input.people[turn.speaker],
          x + 15,
          y + 20,
          interpreted ? 352 : 372,
          12,
          2,
        ],
        [language, x + 15, y + 55, interpreted ? 352 : 372, 12, 2],
        [
          interpreted ? turn.interpretedText : turn.originalText,
          x + 15,
          y + 90,
          interpreted ? 352 : 372,
          interpreted ? 12 : 14,
          4,
        ],
      ]}
    />
  );
}
