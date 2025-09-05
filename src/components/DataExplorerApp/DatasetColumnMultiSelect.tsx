import { MultiSelect } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { ReactNode, useEffect, useMemo } from "react";
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

  // controllable, with uncontrolled fallback
  value?: readonly DatasetColumn[];
  defaultValue?: readonly DatasetColumn[];
  onChange?: (fields: readonly DatasetColumn[]) => void;
};

// Human readable names for fields
const FIELD_NAME_OVERRIDES: Record<string, string> = {
  assignedTo: "Assigned to",
  status: "Status",
  createdAt: "Created at",
  updatedAt: "Updated at",
};

// TODO(jpsyx) we already have DatasetColumnSelect. We shouldn't have both
// components. Refactor and keep only one.
export function DatasetColumnMultiSelect({
  label,
  placeholder,
  datasetId,
  value,
  defaultValue,
  onChange,
}: Props): JSX.Element {
  const [allDatasets, isLoadingDatasets] =
    DatasetClient.useGetAllDatasetsWithColumns(
      datasetId ? where("id", "eq", datasetId) : undefined,
    );

  const { fieldGroupOptions, columnLookup } = useMemo(() => {
    const datasets: DatasetWithColumns[] = allDatasets ?? [];

    // Grouped options for Mantine MultiSelect
    const grouped = datasets.map((ds) => {
      return {
        group: ds.name,
        items: ds.columns.map((col) => {
          return {
            value: col.id as string, // MultiSelect expects string ids
            label: FIELD_NAME_OVERRIDES[col.name] ?? col.name,
          };
        }),
      };
    });

    const cols = datasets.flatMap((ds) => {
      return ds.columns;
    });

    const lookup = makeObjectFromList(cols, { keyFn: getProp("id") });

    return {
      fieldGroupOptions: grouped,
      columnLookup: lookup,
    };
  }, [allDatasets]);

  // Controlled if `value` is
  // provided, otherwise uncontrolled with internal state.
  const [current, setCurrent] = useUncontrolled<readonly DatasetColumn[]>({
    value,
    defaultValue,
    onChange,
    finalValue: [],
  });

  // If the available columns change
  // (e.g., switching dataset), drop any selections no longer present.
  useEffect(() => {
    const pruned = current.filter((c) => {
      return columnLookup.has(c.id as DatasetColumnId);
    });
    if (pruned.length !== current.length) {
      setCurrent(pruned);
    }
  }, [columnLookup, current, setCurrent]);

  const selectedColumnIds = useMemo(() => {
    return current.map(getProp("id")) as string[];
  }, [current]);

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
            return columnLookup.get(id as DatasetColumnId);
          })
          .filter(isNotNullOrUndefined);
        setCurrent(columns);
      }}
      nothingFoundMessage="No fields"
    />
  );
}
