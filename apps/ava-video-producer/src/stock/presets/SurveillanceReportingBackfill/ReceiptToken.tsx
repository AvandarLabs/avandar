import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getRecordPlacementsFromInputAndFrame } from "./getRecordPlacementsFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  record: ReturnType<typeof getRecordPlacementsFromInputAndFrame>[number];
  accent: string;
};
/** A visible key follows its unique record through receipt and placement. */
export function ReceiptToken({ record, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-record-token={record.id}
        data-event-bin={record.eventBinId}
        x={record.x - 13}
        y={record.y - 12}
        width={26}
        height={16}
        rx={scales.corner(3)}
        fill={tokens.color.surface}
        stroke={record.firstSnapshot === 1 ? accent : tokens.color.accentAlt}
      />
      <LabelSlots
        labels={[[String(record.key), record.x - 9, record.y, 20, 12, 1]]}
      />
    </g>
  );
}
