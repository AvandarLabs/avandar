import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CitationUnderline } from "../CitationUnderline";
import { getSourceSheetGeometryFromSelectionAndFrame } from "../getSourceSheetGeometryFromSelectionAndFrame";
import { SourcePassageCopy } from "../SourcePassageCopy";
import { SourceSheet } from "./SourceSheet";
import type { Input } from "../ProvenancePeelback.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
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
      opacity={motion.reveal(frame, 14 + index * motion.stagger.list)}
    >
      <SourceSheet
        height={height}
        angle={angle}
        stroke={selected ? accent : tokens.color.line}
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
