import { makeSelectOptions, Select } from "@avandar/ui";
import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { QueryColumn as QueryColumnModule } from "$/models/queries/QueryColumn/QueryColumn";
import { useOrderDirectionOptions } from "@/views/DataExplorerApp/QueryForm/useOrderDirectionOptions";
import type { ManualQueryFormHandlers } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

type Props = {
  queryColumns: StructuredQuery.Partial["queryColumns"];
  orderByColumn: StructuredQuery.Partial["orderByColumn"];
  orderByDirection: StructuredQuery.Partial["orderByDirection"];
  onSetOrderByColumn: ManualQueryFormHandlers["onSetOrderByColumn"];
  onSetOrderByDirection: ManualQueryFormHandlers["onSetOrderByDirection"];
  withinPortal: boolean;
};

/** Sort column and direction pickers, limited to the selected columns. */
export function SortFields({
  queryColumns,
  orderByColumn,
  orderByDirection,
  onSetOrderByColumn,
  onSetOrderByDirection,
  withinPortal,
}: Props): ReactNode {
  const { t } = useLingui();
  const orderDirectionOptions = useOrderDirectionOptions();
  const selectedColumnOptions = makeSelectOptions(queryColumns, {
    valueFn: prop("id"),
    labelFn: (column) => {
      return QueryColumnModule.getDerivedColumnName(column);
    },
  });

  return (
    <>
      <Select
        clearable
        label={t`Column`}
        data={selectedColumnOptions}
        value={orderByColumn}
        placeholder={t`Select column to sort by`}
        disabled={selectedColumnOptions.length === 0}
        onChange={(newColumnId) => {
          onSetOrderByColumn(newColumnId ?? undefined);
        }}
        comboboxProps={{ withinPortal }}
      />
      <Select
        clearable={false}
        label={t`Direction`}
        placeholder={t`Select sort order`}
        data={orderDirectionOptions}
        value={orderByDirection}
        onChange={(newDirection) => {
          onSetOrderByDirection(newDirection ?? undefined);
        }}
        comboboxProps={{ withinPortal }}
      />
    </>
  );
}
