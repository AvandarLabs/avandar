import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { CapabilityCell } from "./CapabilityCell";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  row: Input["capabilities"][number];
  index: number;
  frame: number;
};
/** All alternatives in one row resolve together on matching baselines. */
export function CapabilityRow({
  input,
  row,
  index,
  frame,
}: Readonly<Props>): ReactNode {
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
    <g data-capability={row.id} opacity={ramp(frame, 36 + index * 12, 12)}>
      <g aria-label={row.label}>
        <FitText {...label} breakLongWords normalizeWhitespace />
      </g>
      {input.options.map((option, optionIndex) => {
        const cell = row.cells.find(({ optionId }) => optionId === option.id)!;
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
