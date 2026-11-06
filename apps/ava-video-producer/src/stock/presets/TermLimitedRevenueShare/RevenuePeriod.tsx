import { EASE, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
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
  const distribution = period.distributionActive
    ? (period.receiptsMinor * input.arrangement.rateBasisPoints) / 10000
    : 0;
  const retained =
    period.receiptsMinor - period.operatingOutflowMinor - distribution;
  const amounts = [period.operatingOutflowMinor, distribution, retained];
  const reveal = ramp(
    frame,
    index === 0 ? 12 : 96,
    index === 0 ? 53 : 44,
    EASE.inOut,
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
      <rect y={45} width={340} height={40} fill="none" stroke={STOCK.line} />
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
