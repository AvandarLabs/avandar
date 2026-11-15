import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getRecordPlacementsFromInputAndFrame } from "./getRecordPlacementsFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  record: ReturnType<typeof getRecordPlacementsFromInputAndFrame>[number];
  accent: string;
};
/** A visible key follows its unique record through receipt and placement. */
export function ReceiptToken({ record, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-record-token={record.id}
        data-event-bin={record.eventBinId}
        x={record.x - 13}
        y={record.y - 12}
        width={26}
        height={16}
        rx={3}
        fill={STOCK.surface}
        stroke={record.firstSnapshot === 1 ? accent : STOCK.cyan}
      />
      <LabelSlots
        labels={[[String(record.key), record.x - 9, record.y, 20, 12, 1]]}
      />
    </g>
  );
}
