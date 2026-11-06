import { EASE, mix, ramp } from "../../../motion";
import { ExtractionRow } from "./ExtractionRow";
import { getAssociationFromInput } from "./getAssociationFromInput";
import { ReviewChoiceMark } from "./ReviewChoiceMark";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Review carries the source token and coordinates without changing evidence.
 */
export function ReviewedExtraction({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const association = getAssociationFromInput(input);
  const progress = ramp(frame, 96, 43, EASE.inOut);
  const x = mix(progress, 588, 540);
  return (
    <g
      opacity={progress}
      data-unresolved={input.reviewedLabelId === null}
      data-chosen-label={association.chosenLabel?.id}
    >
      <path
        data-extracted-source-link="true"
        d={`M100 153 H520 V545 H${x}`}
        fill="none"
        stroke={accent}
        strokeDasharray="3 5"
      />
      <ExtractionRow input={input} x={x} accent={accent} />
      <ReviewChoiceMark input={input} accent={accent} rowRight={x + 360} />
    </g>
  );
}
