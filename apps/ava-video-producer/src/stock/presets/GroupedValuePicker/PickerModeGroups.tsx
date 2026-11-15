import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import type { PickerValueGroup } from "./getPickerGroupsFromInput";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  groups: readonly PickerValueGroup[];
  frame: number;
  accent: string;
};
/** Disjoint frequency bays retain full group labels and counted value marks. */
export function PickerModeGroups({
  input,
  groups,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 56, 14)}>
      {groups.map((group) => (
        <g key={String(group.value)} data-mode-group={String(group.value)}>
          <StockRect
            data-mode-bay={String(group.value)}
            x={group.x}
            y={group.y}
            width={174}
            height={group.height}
            rx={4}
            fill={STOCK.surface}
            stroke={STOCK.line}
          />
          <g opacity={ramp(frame, 92, 4)}>
            <LabelSlots
              labels={[
                [
                  group.value === null
                    ? input.labels.missing
                    : String(group.value),
                  group.x + 8,
                  group.y + 18,
                  156,
                  12,
                  5,
                ],
              ]}
            />
          </g>
          {Array.from({ length: group.count }, (_, index) => (
            <StockRect
              key={index}
              data-frequency-token={String(group.value)}
              x={group.x + 154}
              y={
                group.y +
                (group.value === null ? 90 : 50) +
                index * (group.value === null ? 20 : 36)
              }
              width={12}
              height={8}
              fill={accent}
              opacity={ramp(frame, 90, 2)}
            />
          ))}
        </g>
      ))}
    </g>
  );
}
