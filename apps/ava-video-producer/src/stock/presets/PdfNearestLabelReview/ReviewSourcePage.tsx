import { STOCK } from "../../stockPalette";
import { CandidateAnchorGuides } from "./CandidateAnchorGuides";
import { FigureAnchor } from "./FigureAnchor";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * Literal figures and arbitrarily close candidate anchors retain provenance.
 */
export function ReviewSourcePage({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={60}
        y={170}
        width={400}
        height={300}
        rx={4}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <FigureAnchor input={input} frame={frame} accent={accent} />
      {input.labels.map((label, index) => (
        <CandidateAnchorGuides
          key={label.id}
          input={input}
          index={index}
          frame={frame}
        />
      ))}
    </g>
  );
}
