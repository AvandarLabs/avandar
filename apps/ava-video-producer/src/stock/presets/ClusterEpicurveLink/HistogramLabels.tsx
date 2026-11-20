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
        return <BinLabel key={bin.id} label={bin.label} index={index} />;
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

/** A time bin's number beside its label, three bins to a row. */
function BinLabel({
  label,
  index,
}: Readonly<{ label: string; index: number }>): ReactNode {
  const tokens = useGraphicTokens();
  const y = 385 + Math.floor(index / 3) * 48;
  return (
    <g>
      <text
        x={40 + (index % 3) * 195}
        y={y}
        fill={tokens.color.textMuted}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        {index + 1}
      </text>
      <LabelSlots labels={[[label, 58 + (index % 3) * 195, y, 175, 12, 3]]} />
    </g>
  );
}
