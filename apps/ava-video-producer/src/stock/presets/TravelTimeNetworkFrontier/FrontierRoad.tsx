import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
      <line
        {...source}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      {intervals.map(([start, end]) => {
        return (
          <g key={`${start}:${end}`} data-frontier-road={road.id}>
            <SketchedShape
              shape={{
                kind: "line",
                x1: mix(start, source.x1, source.x2),
                y1: mix(start, source.y1, source.y2),
                x2: mix(end, source.x1, source.x2),
                y2: mix(end, source.y1, source.y2),
              }}
              profile={tokens.sketch.shape}
              stroke={accent}
              strokeWidth={scales.stroke(5)}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </g>
  );
}
