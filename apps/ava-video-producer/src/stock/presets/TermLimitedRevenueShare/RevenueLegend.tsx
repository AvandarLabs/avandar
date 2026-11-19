import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** One ruler and color legend belong equally to both independent periods. */
export function RevenueLegend({ input, accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {" "}
      <SketchedShape
        shape={{ kind: "path", d: "M80 463 V450 H420 V463 M250 450 V458" }}
        profile={tokens.sketch.shape}
        data-common-ruler="true"
        stroke={tokens.color.inactive}
        fill="none"
      />
      <text
        x={80}
        y={480}
        fill={tokens.color.textMuted}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        0
      </text>
      <text
        x={420}
        y={480}
        textAnchor="end"
        fill={tokens.color.textMuted}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        {input.periods[0].receiptsMinor / input.money.minorUnitsPerUnit}
      </text>
      {[input.copy.operating, input.copy.distribution, input.copy.retained].map(
        (label, index) => {
          return (
            <g key={index}>
              <rect
                x={60 + index * 290}
                y={500}
                width={12}
                height={12}
                fill={
                  [tokens.color.accentAlt, tokens.color.highlight, accent][
                    index
                  ]
                }
              />
              <LabelSlots
                labels={[[label, 80 + index * 290, 511, 260, 12, 3]]}
              />
            </g>
          );
        },
      )}
    </g>
  );
}
