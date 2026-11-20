import { useId } from "react";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getKernelSamplesFromInput } from "./getKernelSamplesFromInput";
import { KernelField } from "./KernelField/KernelField";
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
      <text
        x={610}
        y={325}
        fill={data.color}
        fontSize={data.fontSize}
        fontWeight={data.fontWeight}
      >
        0
      </text>
      <text
        x={890}
        y={325}
        fill={data.color}
        textAnchor="end"
        fontSize={data.fontSize}
        fontWeight={data.fontWeight}
      >
        {input.legendMaximum}
      </text>
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
