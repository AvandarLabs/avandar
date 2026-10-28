import { ramp } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
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
  const selected = source.id === input.selectedSourceId;
  const { x, y, height, angle } = getSourceSheetGeometryFromSelectionAndFrame({
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
      opacity={ramp(frame, 14 + index * 2, 12)}
    >
      <StockRect
        x={0}
        y={0}
        width={400}
        height={height}
        rx={3}
        fill={STOCK.surface}
        stroke={selected ? accent : STOCK.line}
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
