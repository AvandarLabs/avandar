import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/**
 * Participant and quantity labels stay outside the physical counting corridor.
 */
export function HandoverLabels({ input }: Readonly<Props>): ReactNode {
  const labels: Array<[string, number, number, number, FitTextSize, number]> = [
    [input.scenarioCaption, 40, 30, 880, 16, 2],
    [input.participantLabels.deliveryTeam, 40, 76, 290, 14, 3],
    [input.participantLabels.recipient, 430, 76, 260, 14, 3],
    [input.receiptLabels.offered, 40, 130, 290, 12, 3],
    [input.receiptLabels.selected, 500, 130, 190, 12, 3],
    [input.receiptLabels.retained, 40, 508, 300, 12, 3],
    [input.receiptLabels.teamCopy, 40, 563, 300, 12, 3],
    [input.receiptLabels.recipientCopy, 510, 575, 410, 12, 2],
  ];
  return (
    <g>
      {labels.map(([text, x, y, width, fontSize, maxLines], index) => (
        <FitText
          key={index}
          text={text}
          x={x}
          y={y}
          width={width}
          fontSize={fontSize}
          maxLines={maxLines}
          normalizeWhitespace
          breakLongWords
        />
      ))}
    </g>
  );
}
