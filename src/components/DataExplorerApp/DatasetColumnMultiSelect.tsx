import { MultiSelect } from "@mantine/core";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { isNotNullOrUndefined } from "@/lib/utils/guards";
import { makeMapFromList } from "@/lib/utils/maps/builders";
import type { DatasetId } from "@/models/datasets/Dataset";
import type {
  DatasetColumn,
  DatasetColumnId,
} from "@/models/datasets/DatasetColumn";

type Props = {
  label?: string;
  placeholder?: string;
  datasetId: DatasetId | null | undefined;
  value: readonly DatasetColumn[]; // selected columns
  onChange: (updatedColumns: readonly DatasetColumn[]) => void;
  disabled?: boolean;
};

const FIELD_NAME_OVERRIDES: Record<string, string> = {
  assignedTo: "Assigned to",
  status: "Status",
  createdAt: "Created at",
  updatedAt: "Updated at",
};

export function DatasetColumnMultiSelect({
  label,
  placeholder,
  datasetId,
  value: selectedColumns,
  onChange,
  disabled,
}: Props): JSX.Element {
  const [dataset, isLoading] = DatasetClient.useGetWithColumns({
    id: datasetId ?? undefined,
    useQueryOptions: { enabled: !!datasetId },
  });

  const { selectOptions, columnById } = useMemo(() => {
    const columns = (dataset?.columns ?? []) as readonly DatasetColumn[];

    return {
      selectOptions: columns.map((col) => {
        return {
          value: col.id,
          label: FIELD_NAME_OVERRIDES[col.name] ?? col.name,
        };
      }),
      columnById: makeMapFromList(columns, {
        keyFn: (col) => {
          return col.id;
        },
      }),
    };
  }, [dataset]);

  return (
    <MultiSelect
      label={label}
      placeholder={placeholder}
      searchable
      clearable
      disabled={disabled || !datasetId}
      data={selectOptions}
      value={selectedColumns.map((col) => {
        return col.id;
      })}
      onChange={(selectedIds) => {
        const updatedColumns = selectedIds
          .map((id) => {
            return columnById.get(id as DatasetColumnId);
          })
          .filter(isNotNullOrUndefined);
        onChange(updatedColumns);
      }}
      nothingFoundMessage={isLoading ? "Loading..." : "No columns"}
    />
  );
}
