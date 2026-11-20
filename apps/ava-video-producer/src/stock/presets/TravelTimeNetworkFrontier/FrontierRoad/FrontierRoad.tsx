import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReachedIntervalsFromRoad } from "../getReachedIntervalsFromRoad";
import { ReachedInterval } from "./ReachedInterval";
import type { Input } from "../TravelTimeNetworkFrontier.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
      <SketchedShape
        shape={{ kind: "line", ...source }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      {intervals.map(([start, end]) => {
        return (
          <ReachedInterval
            key={`${start}:${end}`}
            roadId={road.id}
            source={source}
            start={start}
            end={end}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
