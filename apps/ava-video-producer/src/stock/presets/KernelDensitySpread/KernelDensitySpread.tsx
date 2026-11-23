import { useId } from "react";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getKernelSamplesFromInput } from "./getKernelSamplesFromInput";
import { KernelDensitySpreadLabels } from "./KernelDensitySpreadLabels/KernelDensitySpreadLabels";
import { KernelField } from "./KernelField/KernelField";
import { KernelLegendMaximum } from "./KernelLegendMaximum/KernelLegendMaximum";
import { KernelLegendMinimum } from "./KernelLegendMinimum/KernelLegendMinimum";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./KernelDensitySpread.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Fixed observations and legend expose smoothing as a modeled quantity. */
export function KernelDensitySpread({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { text } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const data = text.graphic.data;
  const body = text.graphic.body;
  const legendId = useId();
  const { radius } = getKernelSamplesFromInput({ input, frame, motion });
  const qualifier =
    "Zero modeled intensity does not establish zero population.";
  return (
    <g data-legend-maximum={input.legendMaximum}>
      <KernelField {...{ input, frame, accent }} />
      <KernelDensitySpreadLabels {...{ input, radius, qualifier }} />
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
      <KernelLegendMinimum text={text} data={data} />
      <KernelLegendMaximum {...{ text, data, input }} />
      <text
        x={610}
        y={438}
        fill={body.color}
        fontSize={body.fontSize}
        fontWeight={body.fontWeight}
      >
        {input.points.length}
      </text>
    </g>
  );
}
