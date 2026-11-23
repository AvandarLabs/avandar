import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../RetailShelfReplenishment.schema";
import type { ReactNode } from "react";

type ParentProps = { input: Input; shelfQuantities: number[] };

type Props = { input: Readonly<ParentProps>["input"] };

/** Renders the delivery and unit labels in authored paint order. */
export function DeliveryAndUnitLabels(options: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={options.input.labels.delivery}
        x={42}
        y={116}
        width={470}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={options.input.labels.unit}
        x={42}
        y={512}
        width={470}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
