import { EntityFieldConfig } from "./types";

/**
 * Make a default EntityFieldConfig draft to use in a creation form.
 *
 * We exclude returning an `entityConfigId` because we probably don't have one
 * yet, if this is part of an EntityConfig form where the entity config id
 * hasn't been created yet.
 */
export function makeDefaultEntityFieldDraft(
  options: {
    name?: string;
    isIdField?: boolean;
    isTitleField?: boolean;
    allowManualEdit?: boolean;
  } = {
    name: "",
    isIdField: false,
    isTitleField: false,
    allowManualEdit: true,
  },
): Omit<EntityFieldConfig<"Insert">, "entityConfigId"> {
  const dateTimeNow = new Date().toISOString();
  return {
    name,
    allowManualEdit,
    isIdField,
    isTitleField,
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
