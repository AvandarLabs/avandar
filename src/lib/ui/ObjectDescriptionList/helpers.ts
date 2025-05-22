import { StringKeyOf } from "type-fest";
import {
  DescribableObject,
  ObjectRenderOptions,
  PrimitiveValueRenderOptions,
} from "./types";

export function getObjectFieldRenderOptions<T extends DescribableObject>(
  renderOptions: ObjectRenderOptions<T>,
  fieldKey: StringKeyOf<T>,
): PrimitiveValueRenderOptions {
  const primitiveValueRenderOptions: PrimitiveValueRenderOptions = {
    emptyString: renderOptions.emptyString,
    nullString: renderOptions.undefinedString,
    undefinedString: renderOptions.undefinedString,
    booleanTrue: renderOptions.booleanTrue,
    booleanFalse: renderOptions.booleanFalse,
    dateFormat: renderOptions.dateFormat,
  };

  return {
    // pass down the parent's primitive value render options
    ...primitiveValueRenderOptions,

    // override with the children render options
    ...renderOptions.childRenderOptions?.[fieldKey],
  };
}
