import { Text } from "../../graphics-common/Text";
import { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import type { BarLegendData } from "./BarRace.types";
import type { ReactNode } from "react";

type Props = BarLegendData;

/** Renders the bar legend layer for BarRace. */
export function BarLegend(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.input.showLegend
        ? options.bars.map((bar, i) => {
            return (
              <g key={bar.label}>
                <circle
                  cx={72 + i * 216}
                  cy={546}
                  r={5}
                  fill={
                    i === 0
                      ? options.accent
                      : getContentColorFromValue({
                          value: bar.color,
                          options: {
                            tokens: options.tokens,
                            accent: options.accent,
                          },
                        })
                  }
                />
                <Text role="choice" x={86 + i * 216} y={552}>
                  {bar.label}
                </Text>
              </g>
            );
          })
        : null}
    </>
  );
}
