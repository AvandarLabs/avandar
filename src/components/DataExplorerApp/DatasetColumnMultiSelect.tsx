import { MultiSelect } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { ReactNode, useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isNotNullOrUndefined } from "@/lib/utils/guards";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { DatasetId, DatasetWithColumns } from "@/models/datasets/Dataset";
import {
  DatasetColumn,
  DatasetColumnId,
} from "@/models/datasets/DatasetColumn";

type Props = {
  label: ReactNode;
  placeholder: string;

  /**
   * If we have a selected dataset, then we will only show fields from
   * that dataset.
   */
  datasetId?: DatasetId;
  onChange: (fields: readonly DatasetColumn[]) => void;
  value?: readonly DatasetColumn[];
  defaultValue?: readonly DatasetColumn[];
};

// Human readable names for fields
const FIELD_NAME_OVERRIDES: Record<string, string> = {
  assignedTo: "Assigned to",
  status: "Status",
  createdAt: "Created at",
  updatedAt: "Updated at",
};

// TODO(jpsyx) we already have DatasetColumnSelect. We shouldnt have both
// components. Refactor and keep only one.
export function DatasetColumnMultiSelect({
  onChange,
  label,
  placeholder,
  datasetId,
  value,
  defaultValue,
}: Props): JSX.Element {
  const [controlledValue, setControlledValue] = useUncontrolled({
    value,
    defaultValue,
    onChange,
  });

  const [allDatasets, isLoadingDatasets] =
    DatasetClient.useGetAllDatasetsWithColumns(
      datasetId ? where("id", "eq", datasetId) : undefined,
    );

  const columnsLookup: Record<DatasetColumnId, DatasetColumn> = useMemo(() => {
    if (!allDatasets) {
      return {};
    }
    return makeObjectFromList(allDatasets.flatMap(getProp("columns")), {
      keyFn: getProp("id"),
    });
  }, [allDatasets]);

  const fieldGroupOptions = useMemo(() => {
    const fieldGroups = (allDatasets ?? []).map(
      (dataset: DatasetWithColumns) => {
        return {
          group: dataset.name,
          items: dataset.columns.map((column: DatasetColumn) => {
            return {
              value: column.id as string,
              label: FIELD_NAME_OVERRIDES[column.name] ?? column.name,
            };
          }),
        };
      },
    );

    return fieldGroups;
  }, [allDatasets]);

  const selectedColumnIds = controlledValue.map(getProp("id"));

  return (
    <MultiSelect
      searchable
      clearable
      label={label}
      placeholder={isLoadingDatasets ? "Loading datasets..." : placeholder}
      data={fieldGroupOptions ?? []}
      value={selectedColumnIds}
      onChange={(columnIds: string[]) => {
        const columns = columnIds
          .map((id) => {
            return columnsLookup[id as DatasetColumnId];
          })
          .filter(isNotNullOrUndefined);
        setControlledValue(columns);
      }}
    />
  );
}
