import { useLingui } from "@lingui/react/macro";
import type { SelectData } from "@avandar/ui";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";

type OrderDirectionOptions = SelectData<StructuredQuery.OrderByDirection>;

/**
 * Returns the localized order direction options for the manual query form.
 * Defined as a hook so the labels follow the active translation function.
 */
export function useOrderDirectionOptions(): OrderDirectionOptions {
  const { t } = useLingui();
  return [
    { value: "asc", label: t`Ascending` },
    { value: "desc", label: t`Descending` },
  ];
}
