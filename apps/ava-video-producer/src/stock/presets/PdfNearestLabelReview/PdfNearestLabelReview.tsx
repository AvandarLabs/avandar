import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { AssociationStatus } from "./AssociationStatus";
import { getAssociationFromInput } from "./getAssociationFromInput";
import { ReviewedExtraction } from "./ReviewedExtraction";
import { ReviewLabelRail } from "./ReviewLabelRail";
import { ReviewSourcePage } from "./ReviewSourcePage";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/** Spatial evidence remains ambiguous until an explicit authored review. */
export function PdfNearestLabelReview({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const association = getAssociationFromInput(input);
  return (
    <g
      data-association-state="true"
      data-distance-ratio={association.ratio}
      data-ambiguous={association.isAmbiguous}
    >
      <LabelSlots
        labels={[
          [input.copy.context, 60, 42, 840, 18, 2],
          [input.copy.source, 60, 80, 400, 14, 3],
          [input.copy.result, 540, 395, 360, 14, 3],
        ]}
      />
      <ReviewSourcePage input={input} frame={frame} accent={accent} />
      {input.labels.map((label, index) => (
        <ReviewLabelRail
          key={label.id}
          input={input}
          index={index}
          frame={frame}
          distance={association.distances[index]}
        />
      ))}
      {frame >= 96 ? (
        <ReviewedExtraction input={input} frame={frame} accent={accent} />
      ) : undefined}
      <AssociationStatus input={input} frame={frame} />
    </g>
  );
}
