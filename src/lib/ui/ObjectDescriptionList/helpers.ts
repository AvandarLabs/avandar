import { StringKeyOf } from "type-fest";
import {
  DescribableObject,
  ObjectRenderOptions,
  PrimitiveFieldValueRenderOptions,
} from "./types";

export function getObjectFieldRenderOptions<T extends DescribableObject>(
  renderOptions: ObjectRenderOptions<T>,
  fieldKey: StringKeyOf<T>,
): PrimitiveFieldValueRenderOptions {
  const primitiveValueRenderOptions: PrimitiveFieldValueRenderOptions = {
    emptyString: renderOptions.emptyString,
    nullString: renderOptions.undefinedString,
    undefinedString: renderOptions.undefinedString,
    booleanTrue: renderOptions.booleanTrue,
    booleanFalse: renderOptions.booleanFalse,
  };

  return {
    ...primitiveValueRenderOptions,
    ...renderOptions.entityFieldOptions?.[fieldKey],
  };
}
