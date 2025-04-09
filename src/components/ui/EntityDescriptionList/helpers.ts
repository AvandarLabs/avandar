import { ObjectStringKey } from "@/types/utilityTypes";
import {
  EntityObject,
  EntityRenderOptions,
  PrimitiveFieldValueRenderOptions,
} from "./types";

export function getEntityFieldRenderOptions<T extends EntityObject>(
  renderOptions: EntityRenderOptions<T>,
  fieldKey: ObjectStringKey<T>,
): PrimitiveFieldValueRenderOptions {
  const primitiveValueRenderOptions: PrimitiveFieldValueRenderOptions = {
    emptyString: renderOptions.emptyString,
    nullOrUndefined: renderOptions.nullOrUndefined,
    booleanTrue: renderOptions.booleanTrue,
    booleanFalse: renderOptions.booleanFalse,
  };

  return {
    ...primitiveValueRenderOptions,
    ...renderOptions.entityFieldOptions?.[fieldKey],
  };
}
