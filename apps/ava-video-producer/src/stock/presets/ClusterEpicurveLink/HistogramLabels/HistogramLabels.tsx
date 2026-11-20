import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BinLabel } from "./BinLabel";
import type { Input } from "../ClusterEpicurveLink.schema";
import type { ReactNode } from "react";
/** Inputs for HistogramLabels. */
type Props = { input: Input };
/** Keyed chronological labels stay outside all bars and case-label rows. */
export function HistogramLabels({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
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
