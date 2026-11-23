import { propEq } from "@avandar/utils";
import { Text } from "../../../graphics-common/Text";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DayImpressionMark } from "./DayImpressionMark";
import type { Input } from "../ClassroomDayPresence.schema";
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
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
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
            opacity={index <= activeIndex ? 1 : atomic.opacity["20"]}
          >
            <Text
              x={center - 11}
              y={y + 4}
              role="data"
              fill={tokens.color.textMuted}
            >
              {index + 1}
            </Text>
            <DayImpressionMark state={state} center={center} y={y} />
          </g>
        );
      })}
    </g>
  );
}
