import { ObjectDescriptionList } from ".";
import { FieldValueArrayBlock } from "./FieldValueArrayBlock";
import { isFieldValueArray, isPrimitiveFieldValue } from "./guards";
import { PrimitiveValueItem } from "./PrimitiveValueItem";
import {
  DescribableObject,
  DescribableValue,
  DescribableValueArrayRenderOptions,
  ObjectRenderOptions,
  PrimitiveValueRenderOptions,
} from "./types";

type Props = {
  value: DescribableValue;
} & PrimitiveValueRenderOptions &
  ObjectRenderOptions<DescribableObject> &
  DescribableValueArrayRenderOptions<DescribableValue>;

export function UnknownValueItem({
  value,
  ...renderOptions
}: Props): JSX.Element {
  if (isPrimitiveFieldValue(value)) {
    return <PrimitiveValueItem value={value} {...renderOptions} />;
  }

  if (isFieldValueArray(value)) {
    return <FieldValueArrayBlock value={value} {...renderOptions} />;
  }

  // only possibility now is that the value is an entity object
  return <ObjectDescriptionList data={value} {...renderOptions} />;
}
