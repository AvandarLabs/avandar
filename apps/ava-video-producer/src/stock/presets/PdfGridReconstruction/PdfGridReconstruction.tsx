import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RESULT_CUE } from "./getEvidenceFromFrame";
import { GridEvidence } from "./GridEvidence";
import { GridSceneHeadings } from "./GridSceneHeadings";
import { GridSourceLinks } from "./GridSourceLinks";
import { ReconstructionGrid } from "./ReconstructionGrid";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/**
 * Page evidence registers literal cells before their adjacent reconstruction.
 */
export function PdfGridReconstruction({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <GridSceneHeadings input={input} />
      <StockRect
        data-source-page="true"
        x={40}
        y={192}
        width={424}
        height={372}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <GridSourceLinks input={input} frame={frame} accent={accent} />
      <GridEvidence input={input} frame={frame} accent={accent} />
      <ReconstructionGrid
        input={input}
        frame={frame}
        accent={accent}
        isResult={false}
      />
      {frame >= RESULT_CUE ? (
        <ReconstructionGrid
          input={input}
          frame={frame}
          accent={accent}
          isResult
        />
      ) : undefined}
    </g>
  );
}
