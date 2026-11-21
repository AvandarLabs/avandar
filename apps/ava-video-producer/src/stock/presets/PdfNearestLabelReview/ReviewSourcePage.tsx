import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CandidateAnchorGuides } from "./CandidateAnchorGuides/CandidateAnchorGuides";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={60}
        y={170}
        width={400}
        height={300}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <FigureAnchor input={input} frame={frame} accent={accent} />
      {input.labels.map((label, index) => {
        return (
          <CandidateAnchorGuides
            key={label.id}
            input={input}
            index={index}
            frame={frame}
          />
        );
      })}
    </g>
  );
}
