import { BooleanPrimitiveValueItem } from "./BooleanPrimitiveValueItem";
import { DatePrimitiveValueItem } from "./DatePrimitiveValueItem";
import { NumberPrimitiveValueItem } from "./NumberPrimitiveValueItem";
import { TextPrimitiveValueItem } from "./TextPrimitiveValueItem";
import type {
  GenericRootData,
  PrimitiveValue,
  RenderAsTypeOptions,
} from "../../ObjectDescriptionList.types";
import type { PrimitiveValueItemProps as Props } from "../PrimitiveValueItem.types";

/** Selects the built-in value conversion for PrimitiveValueItem. */
export function TypedPrimitiveValueItem<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
>({
  renderAsType,
  ...props
}: Readonly<
  Props<T, RootData> & { renderAsType: RenderAsTypeOptions }
>): JSX.Element {
  if (renderAsType === "number") {
    return <NumberPrimitiveValueItem {...props} />;
  }
  if (renderAsType === "boolean") {
    return <BooleanPrimitiveValueItem {...props} />;
  }
  if (renderAsType === "date") {
    return <DatePrimitiveValueItem {...props} />;
  }
  return <TextPrimitiveValueItem {...props} renderAsType={renderAsType} />;
}
