import { uuid } from "@/lib/utils/uuid";
import { EntityFieldConfig } from "./types";

/**
 * Make a default EntityFieldConfig Draft to use in a creation form.
 */
export function makeDefaultEntityFieldDraft(
  options: {
    name?: string;
    isIdField?: boolean;
    isTitleField?: boolean;
    allowManualEdit?: boolean;
  } = {},
): EntityFieldConfig<"Draft"> {
  const {
    name = "",
    isIdField = false,
    isTitleField = false,
    allowManualEdit = true,
  } = options;
  const dateTimeNow = new Date().toISOString();
  return {
    name,
    allowManualEdit,
    isIdField,
    isTitleField,
    draftId: uuid(),
    class: "dimension",
    baseDataType: "string",
    valueExtractorType: "manual_entry",
    createdAt: dateTimeNow,
    updatedAt: dateTimeNow,
    isArray: false,

    // TODO(pablo): use a null to undefined converter to avoid using `null`
    // here. We want this to be set to `undefined`
    description: null,
  };
}
