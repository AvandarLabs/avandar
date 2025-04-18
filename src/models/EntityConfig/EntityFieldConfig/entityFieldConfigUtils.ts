import { Logger } from "@/lib/Logger";
import { EntityFieldConfig } from "./EntityFieldConfig";

/**
 * Make an EntityFieldConfig. For now, we create something filled with lots
 * of defaults, but eventually these should all be inputs in the function.
 */
export function makeEntityFieldConfig({
  id,
  entityConfigId,
  name,
}: Pick<
  EntityFieldConfig,
  "id" | "name" | "entityConfigId"
>): EntityFieldConfig {
  Logger.warn(
    'Eventually makeEntityFieldConfig should return an EntityFieldConfig["Insert"]',
  );

  const dateTimeNow = new Date().toISOString();
  return {
    id,
    name,
    entityConfigId,
    class: "dimension",
    baseType: "string",
    createdAt: dateTimeNow,
    updatedAt: dateTimeNow,
    isArray: false,
    isIdField: false,
    isTitleField: false,
    valueExtractor: {
      extractorType: "manualEntry",
      allowManualEdit: true,
    },

    // TODO(pablo): use a null to undefined converter to avoid using `null`
    // here. We want this to be set to `undefined`
    description: null,
  };
}
