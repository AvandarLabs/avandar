import { ObjectStringKey } from "@/lib/types/utilityTypes";
import {
  EntityObject,
  EntityRenderOptions,
  PrimitiveFieldValueRenderOptions,
} from "@/lib/ui/EntityDescriptionList/types";

export function getEntityFieldRenderOptions<T extends EntityObject>(
  renderOptions: EntityRenderOptions<T>,
  fieldKey: ObjectStringKey<T>,
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
