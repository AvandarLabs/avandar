import { StockRect } from "../../primitives/StockRect/StockRect";
import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./EntitySpineAssembly.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  observation: Input["observations"][number];
  index: number;
  frame: number;
  accent: string;
};
/**
 * Source identities stay readable while numeric contributions travel to a key.
 */
export function SpineObservation({
  input,
  observation,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const entityIndex = input.entities.findIndex(
      ({ id }) => id === observation.entityId,
    ),
    sourceY = 104 + index * 60;
  const targetY = 164 + entityIndex * 100;
  return (
    <g data-observation-row={observation.id}>
      <path
        d={`M390 ${sourceY + 25} H420 V${targetY} H455`}
        fill="none"
        stroke={STOCK.line}
        opacity={ramp(frame, 49, 12)}
      />
      <StockRect
        x={50}
        y={sourceY}
        width={340}
        height={54}
        rx={4}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <LiteralDataText value={observation.id} x={60} y={sourceY + 14} />
      <LiteralDataText value={observation.entityId} x={60} y={sourceY + 32} />
      {frame < 49 || frame >= 139 ? (
        <LabelSlots
          labels={[[String(observation.value), 60, sourceY + 50, 320, 12, 1]]}
        />
      ) : null}
    </g>
  );
}
