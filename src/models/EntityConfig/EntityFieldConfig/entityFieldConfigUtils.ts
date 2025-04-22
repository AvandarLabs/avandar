import { Logger } from "@/lib/Logger";
import { EntityFieldConfig } from "./EntityFieldConfig.types";

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
    allowManualEdit: true,
    entityConfigId,
    class: "dimension",
    baseDataType: "string",
    extractorType: "manual_entry",
    createdAt: dateTimeNow,
    updatedAt: dateTimeNow,
    isArray: false,
    isIdField: false,
    isTitleField: false,

    // TODO(pablo): use a null to undefined converter to avoid using `null`
    // here. We want this to be set to `undefined`
    description: null,
  };
}
