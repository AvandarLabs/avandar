import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; x: number; selected: boolean };
/** Identifies the chosen service after its choice cue. */
export function ServiceChoiceLabel({
  input,
  frame,
  x,
  selected,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {selected && input.showChoiceLabel && frame >= 30 ? (
        <g data-choice-label>
          <FitText
            text={input.labels.choice}
            x={x}
            y={50}
            width={260}
            fontSize={14}
            maxLines={3}
            anchor="middle"
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ) : undefined}
    </>
  );
}
