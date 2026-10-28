import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./OrderedLockAcquisition.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  input: Input;
  operation: Input["operations"][number];
  index: number;
  accent: string;
};
/** Request strips sort geometrically before either operation acquires a key. */
export function LockOperation({
  frame,
  input,
  operation,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const sorting = ramp(frame, 61, 21, EASE.inOut),
    y = 180 + index * 200;
  return (
    <g data-operation={operation.id}>
      <LabelSlots labels={[[operation.label, 50, y + 10, 245, 18, 3]]} />
      {operation.requestedIds.map((resourceId, requestIndex) => {
        const canonicalIndex = input.resources.findIndex(
            ({ id }) => id === resourceId,
          ),
          resource = input.resources[canonicalIndex];
        const x = mix(
          sorting,
          340 + requestIndex * 260,
          340 + canonicalIndex * 260,
        );
        const arc =
          canonicalIndex !== requestIndex && requestIndex === 1
            ? 100 *
              ramp(frame, 53, 8, EASE.inOut) *
              (1 - ramp(frame, 82, 8, EASE.inOut))
            : 0;
        return (
          <g
            key={resourceId}
            data-request-resource={resourceId}
            data-request-operation={operation.id}
          >
            <rect
              data-request-tile={resourceId}
              x={x}
              y={y + arc}
              width={200}
              height={94}
              rx={6}
              fill={STOCK.surface}
              stroke={sorting === 1 ? accent : STOCK.line}
            />
            <LabelSlots
              labels={[[resource.label, x + 12, y + 20 + arc, 176, 14, 3]]}
            />
            <LiteralDataText value={resourceId} x={x + 12} y={y + 82 + arc} />
          </g>
        );
      })}
      {input.showOriginalOrder ? (
        <g
          opacity={0.45}
          data-original-order={operation.requestedIds.join(",")}
        >
          {operation.requestedIds.map((resourceId, requestIndex) => (
            <LiteralDataText
              key={resourceId}
              value={resourceId}
              x={50}
              y={y + 100 + requestIndex * 26}
            />
          ))}
        </g>
      ) : null}
    </g>
  );
}
