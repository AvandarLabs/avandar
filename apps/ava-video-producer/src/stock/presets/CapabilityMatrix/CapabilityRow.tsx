import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CapabilityCell } from "./CapabilityCell";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  row: Input["capabilities"][number];
  index: number;
  frame: number;
};
/** Frames the scanning rule takes to pass one row, which staggers the rows. */
const ROW_SCAN_FRAMES = 12;
/** All alternatives in one row resolve together on matching baselines. */
export function CapabilityRow({
  input,
  row,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = 176 + index * 66;
  const columnWidth = 606 / input.options.length;
  const label = {
    text: row.label,
    x: 70,
    y: y + 19,
    width: 216,
    fontSize: 16 as const,
    maxLines: 3,
  };
  return (
    <g
      data-capability={row.id}
      opacity={motion.reveal(frame, 36 + index * motion.scale(ROW_SCAN_FRAMES))}
    >
      <g aria-label={row.label}>
        <FitText {...label} breakLongWords normalizeWhitespace />
      </g>
      {input.options.map((option, optionIndex) => {
        const cell = row.cells.find(({ optionId }) => {
          return optionId === option.id;
        })!;
        return (
          <CapabilityCell
            key={option.id}
            cell={cell}
            rowId={row.id}
            label={input.stateLabels[cell.state]}
            x={302 + columnWidth * optionIndex}
            y={y}
            width={columnWidth}
            showNotes={input.showNotes}
          />
        );
      })}
    </g>
  );
}
