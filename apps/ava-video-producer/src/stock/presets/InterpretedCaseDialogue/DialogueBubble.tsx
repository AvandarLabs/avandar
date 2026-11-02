import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { DialogueWording } from "./DialogueWording";
import type { Input } from "./InterpretedCaseDialogue.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  turnIndex: number;
  interpreted: boolean;
  accent: string;
};
function _getPlacement({
  input,
  turnIndex,
  interpreted,
}: Readonly<Pick<Props, "input" | "turnIndex" | "interpreted">>) {
  const column =
    input.bubbleLayout === "stacked"
      ? turnIndex
      : interpreted
        ? 1 - turnIndex
        : turnIndex;
  const row =
    input.bubbleLayout === "stacked" ? (interpreted ? 1 : 0) : turnIndex;
  const x = 48 + column * 462 + (interpreted ? 10 : 0);
  const y = 125 + row * 175 + (interpreted ? 5 : 0);
  return { x, y };
}
/** Each supplied wording retains its original speaker and authored language. */
export function DialogueBubble({
  input,
  frame,
  turnIndex,
  interpreted,
  accent,
}: Readonly<Props>): ReactNode {
  const turn = input.turns[turnIndex];
  const at = 24 + turnIndex * 56 + (interpreted ? 20 : 0);
  if (frame <= at) {
    return null;
  }
  const { x, y } = _getPlacement({ input, turnIndex, interpreted });
  return (
    <g
      data-wording={interpreted ? "interpreted" : "original"}
      data-speaker={turn.speaker}
      data-turn={turn.id}
      opacity={ramp(frame, at, 10)}
    >
      <rect
        data-bubble={turn.id}
        x={x}
        y={y}
        width={interpreted ? 382 : 402}
        height={interpreted ? 150 : 155}
        rx={12}
        fill={STOCK.surface}
        stroke={interpreted ? STOCK.cyan : accent}
        strokeWidth={interpreted ? 1 : 2}
      />
      <DialogueWording
        input={input}
        turnIndex={turnIndex}
        interpreted={interpreted}
        x={x}
        y={y}
      />
    </g>
  );
}
