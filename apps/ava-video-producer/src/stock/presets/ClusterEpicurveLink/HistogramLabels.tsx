import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";
/** Inputs for HistogramLabels. */
type Props = { input: Input };

/** Keyed chronological labels stay outside all bars and case-label rows. */
export function HistogramLabels({ input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {input.timeBins.map((bin, index) => {
        return (
          <g key={bin.id}>
            <text
              x={40 + (index % 3) * 195}
              y={385 + Math.floor(index / 3) * 48}
              fill={tokens.color.textMuted}
              fontFamily={tokens.text.graphic.data.fontFamily}
              fontWeight={tokens.text.graphic.data.fontWeight}
              fontSize={tokens.text.graphic.data.fontSize}
            >
              {index + 1}
            </text>
            <LabelSlots
              labels={[
                [
                  bin.label,
                  58 + (index % 3) * 195,
                  385 + Math.floor(index / 3) * 48,
                  175,
                  12,
                  3,
                ],
              ]}
            />
          </g>
        );
      })}
      <text
        x={620}
        y={84}
        fill={tokens.color.textMuted}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        ?
      </text>
      <LabelSlots labels={[[input.copy.unknown, 640, 84, 290, 12, 4]]} />
    </g>
  );
}
