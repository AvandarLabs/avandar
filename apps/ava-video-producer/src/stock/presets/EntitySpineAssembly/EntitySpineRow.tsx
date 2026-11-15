import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import type { Input } from "./EntitySpineAssembly.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  entity: Input["entities"][number];
  index: number;
  frame: number;
  accent: string;
};
/** One spine row receives a nullable aggregate without changing membership. */
export function EntitySpineRow({
  input,
  entity,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const rows = input.observations.filter(
    ({ entityId }) => entityId === entity.id,
  );
  const value = rows.length
    ? rows.reduce((sum, row) => sum + row.value, 0)
    : null;
  const y = 120 + index * 100,
    attachment = ramp(frame, 106, 33, EASE.inOut);
  const x = mix(ramp(frame, 13, 35, EASE.inOut), 495 + index * 12, 460);
  return (
    <g
      data-entity-row={entity.id}
      data-value={attachment === 1 ? String(value) : "pending"}
    >
      <StockRect
        data-spine-body={entity.id}
        x={x}
        y={y}
        width={440}
        height={84}
        rx={6}
        fill={STOCK.surface}
        stroke={accent}
      />
      <LabelSlots labels={[[entity.label, x + 15, y + 18, 200, 14, 3]]} />
      <LiteralDataText value={entity.id} x={x + 15} y={y + 75} />
      <g
        opacity={value === null ? attachment : frame >= 139 ? 1 : 0}
        transform={`translate(${value === null ? mix(attachment, 30, 0) : 0} 0)`}
      >
        <LabelSlots
          labels={[
            [
              value === null ? input.field.missingLabel : String(value),
              690,
              y + 18,
              195,
              14,
              4,
            ],
          ]}
        />
      </g>
    </g>
  );
}
