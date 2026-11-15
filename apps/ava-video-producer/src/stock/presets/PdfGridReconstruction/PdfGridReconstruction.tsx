import { STOCK } from "../../stockPalette";
import { GridEvidence } from "./GridEvidence";
import { GridSceneHeadings } from "./GridSceneHeadings";
import { GridSourceLinks } from "./GridSourceLinks";
import { ReconstructionGrid } from "./ReconstructionGrid";
import type { GraphicProps } from "../../graphics-common";
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
  return (
    <g>
      <GridSceneHeadings input={input} />
      <rect
        data-source-page="true"
        x={40}
        y={192}
        width={424}
        height={372}
        rx={4}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <GridSourceLinks input={input} frame={frame} accent={accent} />
      <GridEvidence input={input} frame={frame} accent={accent} />
      <ReconstructionGrid
        input={input}
        frame={frame}
        accent={accent}
        isResult={false}
      />
      {frame >= 106 ? (
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
