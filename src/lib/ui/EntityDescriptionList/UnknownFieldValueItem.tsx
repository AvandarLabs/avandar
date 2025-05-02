import { EntityDescriptionList } from ".";
import { FieldValueArrayBlock } from "./FieldValueArrayBlock";
import { isFieldValueArray, isPrimitiveFieldValue } from "./guards";
import { PrimitiveFieldValueItem } from "./PrimitiveFieldValueItem";
import {
  EntityObject,
  EntityRenderOptions,
  FieldValue,
  FieldValueArrayRenderOptions,
  PrimitiveFieldValueRenderOptions,
} from "./types";

type Props = {
  value: FieldValue;
} & PrimitiveFieldValueRenderOptions &
  EntityRenderOptions<EntityObject> &
  FieldValueArrayRenderOptions<FieldValue>;

export function UnknownFieldValueItem({
  value,
  ...renderOptions
}: Props): JSX.Element {
  if (isPrimitiveFieldValue(value)) {
    return <PrimitiveFieldValueItem value={value} {...renderOptions} />;
  }

  if (isFieldValueArray(value)) {
    return <FieldValueArrayBlock value={value} {...renderOptions} />;
  }

  // only possibility now is that the value is an entity object
  return <EntityDescriptionList entity={value} {...renderOptions} />;
}
