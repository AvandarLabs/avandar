import { useId } from "react";
import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getKernelSamplesFromInput } from "./getKernelSamplesFromInput";
import { KernelField } from "./KernelField";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./KernelDensitySpread.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/** Fixed observations and legend expose smoothing as a modeled quantity. */
export function KernelDensitySpread({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const legendId = useId();
  const { radius } = getKernelSamplesFromInput({ input, frame });
  const qualifier = stockI18n._({
    id: "motionAtlas.kernel-density-spread.zeroQualifier",
    message: "Zero modeled intensity does not establish zero population.",
  });
  return (
    <g data-legend-maximum={input.legendMaximum}>
      <KernelField input={input} frame={frame} accent={accent} />
      <LabelSlots
        labels={[
          [input.labels.radius, 610, 48, 310, 16, 3],
          [String(Number(radius.toPrecision(3))), 610, 122, 310, 20, 1],
          [input.labels.intensity, 610, 182, 310, 14, 3],
          [input.labels.unit, 610, 260, 310, 12, 3],
          [input.labels.points, 610, 365, 310, 12, 3],
          [qualifier, 610, 470, 310, 12, 4],
        ]}
      />
      <defs>
        <linearGradient id={legendId}>
          <stop offset="0%" stopColor={accent} stopOpacity={0} />
          <stop offset="100%" stopColor={accent} stopOpacity={1} />
        </linearGradient>
      </defs>
      <rect
        x={610}
        y={290}
        width={280}
        height={12}
        fill={`url(#${legendId})`}
      />
      <text x={610} y={325} fill={STOCK.text} fontSize={12}>
        0
      </text>
      <text x={890} y={325} fill={STOCK.text} textAnchor="end" fontSize={12}>
        {input.legendMaximum}
      </text>
      <text x={610} y={438} fill={STOCK.text} fontSize={20}>
        {input.points.length}
      </text>
    </g>
  );
}
