import { Box, Fieldset, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import { Select } from "@/lib/ui/inputs/Select";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { DatasetSelect } from "../common/DatasetSelect";
import { AggregationSelect } from "./AggregationSelect";
import { DatasetColumnMultiSelect } from "./DatasetColumnMultiSelect";
import type { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { DatasetColumn } from "@/models/datasets/DatasetColumn";

const HIDE_WHERE = true;
const HIDE_LIMIT = true;

type Direction = "asc" | "desc";

const orderDirectionOptions: Array<{ value: Direction; label: string }> = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

type Props = {
  errorMessage?: string;

  aggregations: Record<string, QueryAggregationType>;
  selectedDatasetId: DatasetId | undefined;

  selectedColumns: readonly DatasetColumn[];
  selectedGroupByColumns: readonly DatasetColumn[];
  orderByColumn: DatasetColumn | undefined;
  orderByDirection: Direction;

  onAggregationsChange: (next: Record<string, QueryAggregationType>) => void;
  onSelectDatasetChange: (datasetId: DatasetId | undefined) => void;

  onSelectColumnsChange: (columns: readonly DatasetColumn[]) => void;
  onGroupByChange: (columns: readonly DatasetColumn[]) => void;
  onOrderByColumnChange: (column: DatasetColumn | undefined) => void;
  onOrderByDirectionChange: (dir: Direction) => void;
};

export function QueryForm({
  errorMessage,
  aggregations,
  selectedColumns,
  selectedGroupByColumns,
  selectedDatasetId,
  orderByColumn,
  orderByDirection,
  onAggregationsChange,
  onSelectDatasetChange,
  onSelectColumnsChange,
  onGroupByChange,
  onOrderByColumnChange,
  onOrderByDirectionChange,
}: Props): JSX.Element {
  const [hasDatasets, setHasDatasets] = useState<boolean | null>(null);
  const orderFieldOptions = useMemo(() => {
    return selectedColumns.map((column) => {
      return { value: column.id as string, label: column.name };
    });
  }, [selectedColumns]);

  const orderByColumnId =
    orderByColumn?.id ? (orderByColumn.id as string) : null;

  return (
    <form>
      <Stack>
        <DatasetSelect
          placeholder={
            hasDatasets ? "Select a profile" : "You must create a profile"
          }
          value={selectedDatasetId ?? null}
          onChange={(datasetId) => {
            return onSelectDatasetChange(datasetId ?? undefined);
          }}
          onHasDatasets={setHasDatasets}
        />

        <DatasetColumnMultiSelect
          label="Select fields"
          placeholder="Select fields"
          datasetId={selectedDatasetId}
          value={selectedColumns}
          onChange={(cols) => {
            return onSelectColumnsChange(cols ?? []);
          }}
        />

        {selectedColumns.length > 0 ?
          <Fieldset
            legend="Aggregations"
            style={{ backgroundColor: "rgba(255,255,255,0.4)" }}
          >
            {selectedColumns.map((col) => {
              return (
                <AggregationSelect
                  key={col.id}
                  column={col}
                  value={aggregations[col.name] ?? "none"}
                  onChange={(agg) => {
                    onAggregationsChange({
                      ...aggregations,
                      [col.name]: agg,
                    });
                  }}
                />
              );
            })}
          </Fieldset>
        : null}

        {HIDE_WHERE ? null : <Text>Where (react-awesome-query-builder)</Text>}

        <DatasetColumnMultiSelect
          label="Group by"
          placeholder="Group by"
          datasetId={selectedDatasetId}
          value={selectedGroupByColumns}
          onChange={(cols) => {
            return onGroupByChange(cols ?? []);
          }}
        />

        <Select
          label="Order field"
          placeholder="Select field"
          data={orderFieldOptions}
          value={orderByColumnId}
          clearable
          onChange={(newFieldId) => {
            if (newFieldId === null) {
              onOrderByColumnChange(undefined);
              return;
            }
            const newOrderByColumns = selectedColumns.find((field) => {
              return (field.id as string) === newFieldId;
            });
            onOrderByColumnChange(newOrderByColumns);
          }}
        />

        <Box mb="md">
          <Select
            label="Order by"
            placeholder="Select order"
            data={orderDirectionOptions}
            value={orderByDirection}
            clearable={false}
            onChange={(value) => {
              if (value !== null) onOrderByDirectionChange(value as Direction);
            }}
          />

          {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}
          {errorMessage ?
            <DangerText>{errorMessage}</DangerText>
          : null}
        </Box>
      </Stack>
    </form>
  );
}
