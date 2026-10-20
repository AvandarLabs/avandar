import { prop } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./OutreachHouseholdRevisits.schema";
import type { ReactNode } from "react";
type Props = { input: Input; completed: Input["visits"]; accent: string };
/**
 * Supplied map centers stay fixed; indexed label rows reserve complete copy.
 */
export function HouseholdMap({
  input,
  completed,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.households.map((household, index) => {
        const x = 80 + household.x * 480;
        const y = 120 + household.y * 270;
        const events = completed.filter(
          ({ householdId }) => householdId === household.id,
        );
        const state = events.some(prop("contacted"))
          ? "contacted"
          : events.length
            ? "no-contact"
            : "unvisited";
        const color =
          state === "contacted"
            ? accent
            : state === "no-contact"
              ? STOCK.orange
              : STOCK.muted;
        return (
          <g
            key={household.id}
            data-household-id={household.id}
            data-x={x}
            data-y={y}
            data-events={events.length}
            data-state={state}
          >
            <path
              d={`M${x + 19} ${y} L600 ${112 + index * 38} H620`}
              stroke={STOCK.line}
              fill="none"
            />
            <path
              data-home-outline={household.id}
              d={`M${x - 18} ${y - 3} L${x} ${y - 20} L${x + 18} ${y - 3} V${y + 20} H${x - 18} Z`}
              fill={STOCK.surface}
              stroke={color}
              strokeWidth={state === "contacted" ? 3 : 1.5}
            />
            <FitText
              text={String(index + 1)}
              x={x}
              y={y + 1}
              width={30}
              fontSize={14}
              maxLines={1}
              anchor="middle"
              normalizeWhitespace
            />
            <FitText
              text={String(index + 1)}
              x={615}
              y={112 + index * 38}
              width={25}
              fontSize={12}
              maxLines={1}
              normalizeWhitespace
              color={color}
            />
            <FitText
              text={household.label}
              x={650}
              y={112 + index * 38}
              width={270}
              fontSize={12}
              maxLines={2}
              breakLongWords
              normalizeWhitespace
            />
            {input.showVisitStamps
              ? events.map((event, eventIndex) => (
                  <circle
                    key={eventIndex}
                    data-visit-stamp={household.id}
                    cx={x - 10 + eventIndex * 10}
                    cy={y + 14}
                    r={3}
                    fill={event.contacted ? accent : STOCK.orange}
                  />
                ))
              : undefined}
          </g>
        );
      })}
    </g>
  );
}
