import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DeliveryAndUnitLabels } from "./DeliveryAndUnitLabels";
import { GoodQuantityLabel } from "./GoodQuantityLabel";
import { RetailerAndShopperLabels } from "./RetailerAndShopperLabels";
import type { Input } from "../RetailShelfReplenishment.schema";
import type { ReactNode } from "react";

type Props = { input: Input; shelfQuantities: number[] };

/** Fixed copy rails remain clear of all product and hand travel. */
export function ShelfLabels({
  input,
  shelfQuantities,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {input.goods.map((good, index) => {
        return (
          <GoodQuantityLabel
            key={good.id}
            input={input}
            shelfQuantities={shelfQuantities}
            tokens={tokens}
            good={good}
            index={index}
          />
        );
      })}
      <RetailerAndShopperLabels input={input} />
      <DeliveryAndUnitLabels input={input} />
      <FitText
        text={input.scenarioCaption}
        x={42}
        y={576}
        width={870}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
