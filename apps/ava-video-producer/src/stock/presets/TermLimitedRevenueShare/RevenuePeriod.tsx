import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RevenuePortions } from "./RevenuePortions";
import type { Input } from "./TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";

type Props = {
  period: Input["periods"][number];
  index: number;
  frame: number;
  input: Input;
  accent: string;
};
/** Equal-width receipt strips partition exact integer minor-unit flows. */
export function RevenuePeriod({
  period,
  index,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const periodAmounts = _getPeriodAmounts({ period, input });
  const { distribution, retained, amounts } = periodAmounts;
  const reveal = motion.ramp(
    frame,
    index === 0 ? 12 : 96,
    motion.scale(index === 0 ? 53 : 44),
    motion.travel.easing,
  );
  const x = input.arrangementLayout === "stacked" ? 80 : 80 + index * 460;
  const y = input.arrangementLayout === "stacked" ? 155 + index * 145 : 195;
  return (
    <g
      data-period={period.id}
      data-distribution={distribution}
      data-retained={retained}
      data-reveal={reveal}
      transform={`translate(${x} ${y})`}
    >
      <LabelSlots labels={[[period.label, 0, 0, 340, 14, 3]]} />
      <StockRect
        y={45}
        width={340}
        height={40}
        fill="none"
        stroke={tokens.color.line}
      />
      <RevenuePortions
        amounts={amounts}
        receipts={period.receiptsMinor}
        reveal={reveal}
        input={input}
        accent={accent}
      />
    </g>
  );
}
/** The period's operating outflow, distribution, and retained receipts. */
function _getPeriodAmounts({
  period,
  input,
}: Readonly<{ period: Props["period"]; input: Input }>) {
  const distribution = period.distributionActive
    ? (period.receiptsMinor * input.arrangement.rateBasisPoints) / 10000
    : 0;
  const retained =
    period.receiptsMinor - period.operatingOutflowMinor - distribution;
  return {
    distribution,
    retained,
    amounts: [period.operatingOutflowMinor, distribution, retained],
  };
}
