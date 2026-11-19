import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CitationUnderline } from "./CitationUnderline";
import { getSourceSheetGeometryFromSelectionAndFrame } from "./getSourceSheetGeometryFromSelectionAndFrame";
import { SourcePassageCopy } from "./SourcePassageCopy";
import type { Input } from "./ProvenancePeelback.schema";
import type { ReactNode } from "react";

type Props = {
  source: Input["sources"][number];
  index: number;
  otherIndex: number;
  input: Input;
  frame: number;
  accent: string;
};
/** A source sheet opens physically while its passage remains upright. */
export function ProvenanceSource({
  source,
  index,
  otherIndex,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const selected = source.id === input.selectedSourceId;
  const { x, y, height, angle } = getSourceSheetGeometryFromSelectionAndFrame({
    motion,
    index,
    otherIndex,
    selected,
    frame,
    arrangement: input.sourceArrangement,
  });
  return (
    <g
      data-source-sheet={source.id}
      transform={`translate(${x} ${y})`}
      opacity={motion.reveal(frame, 14 + index * 2)}
    >
      <StockRect
        x={0}
        y={0}
        width={400}
        height={height}
        rx={scales.corner(3)}
        fill={tokens.color.surface}
        stroke={selected ? accent : tokens.color.line}
        transform={`rotate(${angle} 200 ${height / 2})`}
      />
      <SourcePassageCopy
        source={source}
        selected={selected}
        showLocators={input.showLocators}
        height={height}
        accent={accent}
      />
      {selected ? (
        <CitationUnderline source={source} frame={frame} accent={accent} />
      ) : undefined}
    </g>
  );
}
