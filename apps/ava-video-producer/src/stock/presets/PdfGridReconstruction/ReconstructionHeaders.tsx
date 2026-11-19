import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";

type Props = { input: Input; columnXs: number[]; width: number };
/** Fixed readable headings travel with the reconstructed columns. */
export function ReconstructionHeaders({
  input,
  columnXs,
  width,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {" "}
      {input.grid.columnLabels.map((label, columnIndex) => {
        return (
          <g key={columnIndex}>
            <StockRect
              x={columnXs[columnIndex]}
              y={210}
              width={width}
              height={80}
              fill="none"
              stroke={tokens.color.line}
            />
            <LabelSlots
              labels={[
                [label, columnXs[columnIndex] + 8, 222, width - 16, 12, 4],
              ]}
            />
          </g>
        );
      })}
    </g>
  );
}
