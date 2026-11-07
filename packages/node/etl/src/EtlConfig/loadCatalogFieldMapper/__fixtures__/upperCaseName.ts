import type { CatalogFieldScriptContext } from "@etl/EtlConfig/loadCatalogFieldMapper/loadCatalogFieldMapper";

/** Test fixture: the record's `name`, upper-cased, tagged with the field. */
export default function upperCaseName(
  record: unknown,
  context: CatalogFieldScriptContext,
): unknown {
  const name = (record as { name?: unknown }).name;
  return typeof name === "string"
    ? `${name.toUpperCase()} (${context.field} on ${context.driveKey})`
    : undefined;
}
