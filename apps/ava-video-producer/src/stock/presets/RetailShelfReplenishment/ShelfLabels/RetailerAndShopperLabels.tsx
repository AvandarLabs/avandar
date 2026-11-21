import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../RetailShelfReplenishment.schema";
import type { ReactNode } from "react";

type ParentProps = { input: Input; shelfQuantities: number[] };

type Props = {
  input: Readonly<ParentProps>["input"];
};

/** Renders the retailer and shopper labels in authored paint order. */
export function RetailerAndShopperLabels(options: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={options.input.labels.retailer}
        x={570}
        y={70}
        width={340}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={options.input.labels.shopper}
        x={570}
        y={520}
        width={340}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
