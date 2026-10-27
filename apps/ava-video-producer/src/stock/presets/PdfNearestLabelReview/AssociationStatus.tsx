import { ramp } from "../../../motion";
import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { getAssociationFromInput } from "./getAssociationFromInput";
import {
  ambiguityMessage,
  ratioMessage,
  unresolvedMessage,
} from "./PdfNearestLabelReview.controls";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/**
 * Uncertainty remains explicit independently of optional numeric annotations.
 */
export function AssociationStatus({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const association = getAssociationFromInput(input);
  return (
    <g opacity={ramp(frame, 95, 8)}>
      {" "}
      {input.showDistanceValues ? (
        <g data-ratio-value="true">
          <LabelSlots
            labels={[[stockI18n._(ratioMessage), 60, 510, 400, 14, 2]]}
          />
          <LiteralDataText
            value={`≈ ${association.ratio.toPrecision(3)}`}
            x={60}
            y={552}
          />
        </g>
      ) : undefined}
      {association.isAmbiguous ? (
        <LabelSlots
          labels={[[stockI18n._(ambiguityMessage), 60, 585, 420, 14, 1]]}
        />
      ) : undefined}
      {input.reviewedLabelId === null ? (
        <LabelSlots
          labels={[[stockI18n._(unresolvedMessage), 540, 580, 360, 14, 1]]}
        />
      ) : undefined}
    </g>
  );
}
