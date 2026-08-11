import { useLingui } from "@lingui/react/macro";
import type { SelectData } from "@ui";
import type { OrderByDirection } from "$/models/queries/StructuredQuery/StructuredQuery.types";

/**
 * Returns the localized order direction options for the manual query form.
 * Defined as a hook so the labels follow the active translation function.
 */
export function useOrderDirectionOptions(): SelectData<OrderByDirection> {
  const { t } = useLingui();
  return [
    { value: "asc", label: t`Ascending` },
    { value: "desc", label: t`Descending` },
  ];
}
