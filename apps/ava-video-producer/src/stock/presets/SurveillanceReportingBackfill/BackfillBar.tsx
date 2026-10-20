import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  id: string;
  label: string;
  index: number;
  width: number;
  prior: number;
  revised: number;
  height: number;
  showPrior: boolean;
  accent: string;
};
/** Bar area and the retained outline share the same event-date baseline. */
export function BackfillBar({
  id,
  label,
  index,
  width,
  prior,
  revised,
  height,
  showPrior,
  accent,
}: Readonly<Props>): ReactNode {
  const x = 68 + index * width + 12;
  return (
    <g data-bin={id} data-prior={prior} data-revised={revised}>
      <rect
        data-bin-bar={id}
        x={x}
        y={480 - height}
        width={width - 24}
        height={height}
        fill={accent}
        fillOpacity={0.18}
      />
      {showPrior ? (
        <rect
          data-prior-outline={id}
          x={x}
          y={480 - prior * 18}
          width={width - 24}
          height={prior * 18}
          fill="none"
          stroke={STOCK.orange}
          strokeDasharray="5 3"
        />
      ) : undefined}
      <LabelSlots
        labels={[[label, 68 + index * width, 505, width - 10, 12, 4]]}
      />
    </g>
  );
}
