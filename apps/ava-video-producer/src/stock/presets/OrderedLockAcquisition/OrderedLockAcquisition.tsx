import { prop } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import { getLockStateFromFrame } from "./getLockStateFromFrame";
import { LockOperation } from "./LockOperation";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./OrderedLockAcquisition.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/** Opposite request strips become a single exclusive acquisition sequence. */
export function OrderedLockAcquisition({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g data-canonical-order={input.resources.map(prop("id")).join(",")}>
      <LabelSlots
        labels={[
          [
            frame >= 140 ? input.copy.after : input.copy.before,
            50,
            30,
            850,
            14,
            1,
          ],
          [input.copy.context, 50, 595, 850, 14, 1],
        ]}
      />
      {input.resources.map((resource, index) => (
        <g key={resource.id}>
          <rect
            x={340 + index * 260}
            y={55}
            width={240}
            height={84}
            rx={6}
            fill={STOCK.elevated}
            stroke={STOCK.line}
          />
          <LabelSlots
            labels={[[resource.label, 350 + index * 260, 72, 190, 14, 3]]}
          />
          <LiteralDataText value={resource.id} x={350 + index * 260} y={128} />
        </g>
      ))}
      {frame < 53
        ? input.operations.map((operation, index) => {
            const resourceIndex = input.resources.findIndex(
              ({ id }) => id === operation.requestedIds[0],
            );
            return (
              <path
                key={operation.id}
                data-reach={operation.id}
                d={`M300 ${205 + index * 200} L${560 + resourceIndex * 260} 145`}
                fill="none"
                stroke={STOCK.orange}
                strokeDasharray="5 7"
                opacity={0.65}
              />
            );
          })
        : null}
      {input.operations.map((operation, index) => (
        <LockOperation
          key={operation.id}
          frame={frame}
          input={input}
          operation={operation}
          index={index}
          accent={accent}
        />
      ))}
      {input.resources.map((resource, resourceIndex) => {
        const state = getLockStateFromFrame({ frame, input, resourceIndex });
        return (
          <circle
            key={resource.id}
            data-lock-key={resource.id}
            data-key-owner={state.owner}
            cx={state.x}
            cy={state.y}
            r={11}
            fill={state.owner ? accent : STOCK.cyan}
            stroke={STOCK.text}
            strokeWidth={2}
          />
        );
      })}
    </g>
  );
}
