import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { FilterableColumn } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishSliceSection.types";
import type { ReactNode } from "react";

type Props = {
  columns: readonly FilterableColumn[];
  onAdd: (rowFilter: PublishSliceConfig.RowFilter) => void;
};

/** Maps a column to the row filter that matches its data type. */
function _columnToRowFilter(
  column: FilterableColumn,
): PublishSliceConfig.RowFilter {
  const id = crypto.randomUUID();
  const columnName = column.name;
  return (
    AvaDataType.isNumeric(column.type) ?
      { id, kind: "range_number", columnName }
    : AvaDataType.isTemporal(column.type) ?
      { id, kind: "range_date", columnName }
    : { id, kind: "enum", columnName, values: [] }
  );
}

/** Creates a row filter matching the selected column's data type. */
export function AddRowFilterMenu({ columns, onAdd }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      placeholder={t`+ Add row filter`}
      size="xs"
      searchable
      clearable={false}
      data={columns.map((column) => {
        return { value: column.name, label: column.name };
      })}
      onChange={(columnName) => {
        columns
          .filter(propEq("name", columnName ?? ""))
          .map(_columnToRowFilter)
          .forEach(onAdd);
      }}
      w={220}
    />
  );
}
