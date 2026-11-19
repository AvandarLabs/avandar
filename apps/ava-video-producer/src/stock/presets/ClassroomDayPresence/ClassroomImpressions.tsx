import { propEq } from "@avandar/utils";
import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
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
            {state === "present" ? (
              <circle
                cx={center + 7}
                cy={y}
                r={5}
                fill={tokens.color.positive}
              />
            ) : state === "absent" ? (
              <StockRect
                x={center + 2}
                y={y - 5}
                width={10}
                height={10}
                fill="none"
                stroke={tokens.color.inactive}
              />
            ) : (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M ${center + 7} ${y - 6} l 6 6 l -6 6 l -6 -6 Z`,
                }}
                profile={tokens.sketch.shape}
                fill="none"
                stroke={tokens.color.highlight}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
