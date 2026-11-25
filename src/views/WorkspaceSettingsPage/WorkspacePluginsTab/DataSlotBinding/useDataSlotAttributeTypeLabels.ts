import { useLingui } from "@lingui/react/macro";
import type { DataSlotAttributeType } from "@avandar/plugin-manifest/runtime";

/**
 * The name an admin reads for each data slot attribute type, such as "Date"
 * for `date`. Shown under each attribute's field picker when binding a slot,
 * and in the reason a binding broke.
 */
export function useDataSlotAttributeTypeLabels(): Record<
  DataSlotAttributeType,
  string
> {
  const { t } = useLingui();
  return {
    number: t`Number`,
    date: t`Date`,
    text: t`Text`,
    boolean: t`Yes / no`,
    "geo.admin1": t`Province or region, name or code`,
    "geo.admin2": t`District, name or code`,
  };
}
