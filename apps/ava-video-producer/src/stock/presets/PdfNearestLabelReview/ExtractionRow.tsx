import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { getAssociationFromInput } from "./getAssociationFromInput";
import { unresolvedMessage } from "./PdfNearestLabelReview.controls";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";

type Props = { input: Input; x: number; accent: string };
/** The extracted row carries the unchanged token and its source position. */
export function ExtractionRow({
  input,
  x,
  accent,
}: Readonly<Props>): ReactNode {
  const association = getAssociationFromInput(input);
  return (
    <g>
      {" "}
      <rect
        data-extracted-row="true"
        data-original-x={input.figure.x}
        data-original-y={input.figure.y}
        x={x}
        y={440}
        width={360}
        height={105}
        fill="none"
        stroke={accent}
      />
      <LabelSlots
        labels={[
          [
            association.chosenLabel?.text ?? stockI18n._(unresolvedMessage),
            x + 12,
            464,
            336,
            16,
            2,
          ],
        ]}
      />
      <LiteralDataText value={input.figure.text} x={x + 12} y={507} />
      <LiteralDataText
        value={`≈ ${input.figure.x.toPrecision(4)}, ${input.figure.y.toPrecision(4)}`}
        x={x + 12}
        y={532}
      />
    </g>
  );
}
