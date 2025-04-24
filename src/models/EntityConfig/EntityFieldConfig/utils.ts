import { uuid } from "@/lib/utils/uuid";
import { EntityFieldConfig } from "./types";

/**
 * Make a default EntityFieldConfig Draft to use in a creation form.
 */
export function makeDefaultEntityFieldDraft({
  name,
  isIdField,
  isTitleField,
}: {
  name: string;
  isIdField: boolean;
  isTitleField: boolean;
}): EntityFieldConfig<"Draft"> {
  const dateTimeNow = new Date().toISOString();
  return {
    name,
    isIdField,
    isTitleField,
    allowManualEdit: false,
    isArray: false,
    draftId: uuid(),
    class: "dimension",
    baseDataType: "string",
    valueExtractorType: "manual_entry",
    createdAt: dateTimeNow,
    updatedAt: dateTimeNow,

    // TODO(pablo): use a null to undefined converter to avoid using `null`
    // here. We want this to be set to `undefined`
    description: null,
  };
}
