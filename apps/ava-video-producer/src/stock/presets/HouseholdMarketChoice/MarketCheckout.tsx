import { prop } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MarketBalance } from "./MarketBalance";
import { MarketCheckoutTotal } from "./MarketCheckoutTotal/MarketCheckoutTotal";
import { MarketCheckoutUnitLabel } from "./MarketCheckoutUnitLabel/MarketCheckoutUnitLabel";
import { MarketTender } from "./MarketTender/MarketTender";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const total = input.products.filter(prop("chosen")).reduce((sum, product) => {
    return sum + product.price;
  }, 0);
  const paid = frame >= 126 ? total : 0;
  const balance = input.availableCredits - paid;
  return (
    <g>
      <MarketTender {...{ input, frame, accent, total }} />
      <MarketCheckoutUnitLabel input={input} />
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
      <MarketCheckoutTotal {...{ total, accent, tokens }} />
      <MarketBalance {...{ input, balance, accent }} />
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
