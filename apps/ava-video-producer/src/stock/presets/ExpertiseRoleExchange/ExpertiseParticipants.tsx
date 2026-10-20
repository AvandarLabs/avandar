import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string; toolX: number };
/** Equal-scale participants retain names and organizational roles. */
export function ExpertiseParticipants({
  input,
  frame,
  accent,
  toolX,
}: Readonly<Props>): ReactNode {
  const topic = input.topics[frame < 83 ? 0 : 1];
  const reach = ramp(frame, 35, 15);
  return (
    <g>
      {input.people.map((person, index) => {
        const x =
          index === 0
            ? input.tableArrangement === "side-by-side"
              ? 350
              : 210
            : input.tableArrangement === "side-by-side"
              ? 610
              : 750;
        const labelX =
          input.tableArrangement === "side-by-side"
            ? index === 0
              ? 240
              : 500
            : index === 0
              ? 60
              : 680;
        const isExpert = person.id === topic.expertId;
        const restingX = x + (index === 0 ? 22 : -22);
        const isOutgoing = person.id === input.topics[0].expertId;
        const transfer = frame >= 83 && frame <= 103;
        const contact = transfer
          ? isOutgoing
            ? 1 - ramp(frame, 93, 10)
            : ramp(frame, 83, 10)
          : isExpert
            ? reach
            : 0;
        const handX = mix(contact, restingX, toolX);
        const handY = mix(contact, 315, 325);
        return (
          <g
            key={person.id}
            data-person-id={person.id}
            opacity={ramp(frame, 12 + index * 2, 12)}
          >
            <LabelSlots
              labels={[
                [person.label, labelX, 95, 220, 20, 3],
                ...(input.showJobRoles
                  ? [
                      [person.roleLabel, labelX, 185, 220, 14, 3] as [
                        string,
                        number,
                        number,
                        number,
                        14,
                        number,
                      ],
                    ]
                  : []),
              ]}
            />
            <PersonGlyph x={x} y={290} size={72} color={accent} />
            <path
              d={`M${x} 290 L${handX} ${handY}`}
              fill="none"
              stroke={isExpert ? accent : STOCK.muted}
              strokeWidth={4}
            />
            <circle
              data-transfer-hand={
                frame >= 83 && frame <= 103 ? "true" : undefined
              }
              data-demonstrating-hand={isExpert ? "true" : undefined}
              data-person-id={person.id}
              cx={handX}
              cy={handY}
              r={5}
              fill={accent}
            />
            <g opacity={ramp(frame, 35, 12)}>
              <LabelSlots
                labels={[
                  [
                    isExpert ? input.labels.demonstrates : input.labels.learns,
                    index === 0 ? 60 : 680,
                    360,
                    220,
                    14,
                    4,
                  ],
                ]}
              />
            </g>
          </g>
        );
      })}
    </g>
  );
}
