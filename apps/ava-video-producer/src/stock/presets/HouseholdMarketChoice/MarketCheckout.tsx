import { prop } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { MarketBalance } from "./MarketBalance";
import { MarketTender } from "./MarketTender";
import type { Input } from "./HouseholdMarketChoice.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Tender passes to the retailer while the exact residual remains with shopper.
 */
export function MarketCheckout({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const total = input.products
    .filter(prop("chosen"))
    .reduce((sum, product) => sum + product.price, 0);
  const paid = frame >= 126 ? total : 0;
  const balance = input.availableCredits - paid;
  return (
    <g>
      <MarketTender input={input} frame={frame} accent={accent} total={total} />
      <FitText
        text={input.labels.unit}
        x={640}
        y={521}
        width={190}
        fontSize={12}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={input.labels.total}
        x={280}
        y={521}
        width={220}
        fontSize={12}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      <text data-total={total} x={550} y={521} fill={accent} fontSize={16}>
        {total}
      </text>
      <MarketBalance input={input} balance={balance} accent={accent} />
      <FitText
        text={input.labels.tender}
        x={40}
        y={577}
        width={880}
        fontSize={14}
        maxLines={1}
        normalizeWhitespace
        breakLongWords
      />
    </g>
  );
}
