import { propEq } from "@avandar/utils";
import { Text } from "../../graphics-common";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ClassroomDayPresence.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  learnerId: string;
  x: number;
  y: number;
  activeIndex: number;
};
/**
 * Circle, empty square and question diamond preserve each supplied day's
 * record.
 */
export function ClassroomImpressions({
  input,
  learnerId,
  x,
  y,
  activeIndex,
}: Readonly<Props>): ReactNode {
  if (!input.showDayImpressions) {
    return undefined;
  }
  return (
    <g>
      {input.days.map((day, index) => {
        const state = day.records.find(propEq("learnerId", learnerId))!.state,
          center = x - 40 + index * 40;
        return (
          <g
            key={day.id}
            data-day-impression={day.id}
            data-learner={learnerId}
            opacity={index <= activeIndex ? 1 : 0.2}
          >
            <Text x={center - 11} y={y + 4} size={12} fill={STOCK.muted}>
              {index + 1}
            </Text>
            {state === "present" ? (
              <circle cx={center + 7} cy={y} r={5} fill={STOCK.mint} />
            ) : state === "absent" ? (
              <rect
                x={center + 2}
                y={y - 5}
                width={10}
                height={10}
                fill="none"
                stroke={STOCK.muted}
              />
            ) : (
              <path
                d={`M ${center + 7} ${y - 6} l 6 6 l -6 6 l -6 -6 Z`}
                fill="none"
                stroke={STOCK.orange}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
