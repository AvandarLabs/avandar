import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getReachedIntervalsFromRoad } from "./getReachedIntervalsFromRoad";
import type { Input } from "./TravelTimeNetworkFrontier.schema";
import type { ReactNode } from "react";

type Endpoint = Input["nodes"][number] & { cost: number };
type Props = {
  road: Input["roads"][number];
  first: Endpoint;
  second: Endpoint;
  time: number;
  accent: string;
};
/** Both reached endpoints extend one capped union along their authored road. */
export function FrontierRoad({
  road,
  first,
  second,
  time,
  accent,
}: Readonly<Props>): ReactNode {
  const source = {
    x1: 48 + first.x * 4,
    y1: 150 + first.y * 3.4,
    x2: 48 + second.x * 4,
    y2: 150 + second.y * 3.4,
  };
  const intervals = getReachedIntervalsFromRoad({
    time,
    firstCost: first.cost,
    secondCost: second.cost,
    minutes: road.minutes,
  });
  return (
    <g>
      <line {...source} stroke={STOCK.line} strokeWidth={3} />
      {intervals.map(([start, end]) => (
        <line
          key={`${start}:${end}`}
          data-frontier-road={road.id}
          x1={mix(start, source.x1, source.x2)}
          y1={mix(start, source.y1, source.y2)}
          x2={mix(end, source.x1, source.x2)}
          y2={mix(end, source.y1, source.y2)}
          stroke={accent}
          strokeWidth={5}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}
