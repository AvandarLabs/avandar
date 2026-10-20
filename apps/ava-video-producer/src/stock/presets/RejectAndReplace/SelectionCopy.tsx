import { EASE, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./RejectAndReplace.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; isReplacement: boolean };

function _getLabelsFromSelection({
  frame,
  input,
  isReplacement,
}: Readonly<Props>) {
  const option = isReplacement ? input.replacement : input.rejected;
  const rationale = ramp(frame, isReplacement ? 108 : 60, 12);
  return [
    {
      text: isReplacement
        ? input.decisionLabels.selected
        : input.decisionLabels.rejected,
      y: 239,
      width: 216,
      fontSize: 14 as const,
      maxLines: 2,
      color: STOCK.muted,
      opacity: isReplacement ? rationale : ramp(frame, 48, 30, EASE.inOut),
    },
    {
      text: option.label,
      y: 325,
      width: 216,
      fontSize: 18 as const,
      maxLines: 3,
      color: STOCK.text,
      opacity: 1,
    },
    {
      text: option.reason,
      y: 420,
      width: 272,
      fontSize: 16 as const,
      maxLines: 4,
      color: STOCK.muted,
      opacity: rationale,
    },
  ];
}

/** Option names, states and rationales retain complete fixed-size text. */
export function SelectionCopy({
  frame,
  input,
  isReplacement,
}: Readonly<Props>): ReactNode {
  const labels = _getLabelsFromSelection({ frame, input, isReplacement });
  return (
    <g>
      {labels.map(({ opacity, ...label }, index) => (
        <g key={index} opacity={opacity} aria-label={label.text}>
          <FitText
            {...label}
            x={0}
            breakLongWords
            normalizeWhitespace
            anchor="middle"
          />
        </g>
      ))}
    </g>
  );
}
