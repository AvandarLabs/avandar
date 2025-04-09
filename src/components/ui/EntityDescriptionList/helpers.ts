import {
  EntityObject,
  EntityRenderOptions,
  PrimitiveFieldValueRenderOptions,
} from "./types";

export function getEntityFieldRenderOptions<
  T extends EntityObject,
  K extends keyof T = keyof T,
>(
  renderOptions: EntityRenderOptions<T, K>,
  fieldKey: K,
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
