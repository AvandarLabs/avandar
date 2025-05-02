import { StringKeyOf } from "type-fest";
import {
  EntityObject,
  EntityRenderOptions,
  PrimitiveFieldValueRenderOptions,
} from "@/lib/ui/EntityDescriptionList/types";

export function getEntityFieldRenderOptions<T extends EntityObject>(
  renderOptions: EntityRenderOptions<T>,
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
