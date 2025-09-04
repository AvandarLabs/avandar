import { Box, Fieldset, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import { Select } from "@/lib/ui/inputs/Select";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { difference } from "@/lib/utils/arrays";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys, omit } from "@/lib/utils/objects/misc";
import { DatasetSelect } from "../common/DatasetSelect";
import { AggregationSelect } from "./AggregationSelect";
import { DatasetColumnMultiSelect } from "./DatasetColumnMultiSelect";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { DatasetColumn } from "@/models/datasets/DatasetColumn";

const HIDE_WHERE = true;
const HIDE_LIMIT = true;

type Direction = "asc" | "desc";

const orderOptions: Array<{ value: Direction; label: string }> = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const;

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
  const fieldOptionsById = useMemo(() => {
    return selectedColumns.map((c) => {
      return { value: c.id as string, label: c.name };
    });
  }, [selectedColumns]);

  const orderByColumnId =
    orderByColumn?.id ? (orderByColumn.id as string) : null;

  return (
    <form>
      <Stack>
        <DatasetSelect
          value={selectedDatasetId ?? null}
          onChange={(datasetId) => {
            onSelectDatasetChange(datasetId ?? undefined);
          }}
        />

        <DatasetColumnMultiSelect
          label="Select fields"
          placeholder="Select fields"
          datasetId={selectedDatasetId}
          value={selectedColumns}
          onChange={(columns) => {
            onSelectColumnsChange(columns);

            const incoming = columns.map(getProp("name"));
            const prevAgg = aggregations;
            const prevNames = objectKeys(prevAgg);
            const dropped = difference(prevNames, incoming);

            const defaults = makeObjectFromList(incoming, {
              defaultValue: "none" as const,
            });

            onAggregationsChange(omit({ ...defaults, ...prevAgg }, dropped));
          }}
        />

        {selectedColumns.length > 0 ?
          <Fieldset
            legend="Aggregations"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
            }}
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
            onGroupByChange(cols);
          }}
        />

        <Select<string>
          label="Select field"
          placeholder="Select field"
          data={fieldOptionsById}
          value={orderByColumnId}
          clearable
          onChange={(id) => {
            if (id === null) {
              onOrderByColumnChange(undefined);
              return;
            }
            const selected = selectedColumns.find((field) => {
              return (field.id as string) === id;
            });
            onOrderByColumnChange(selected);
          }}
        />

        <Box mb="md">
          <Select<Direction>
            label="Order by"
            placeholder="Select order"
            data={orderOptions}
            value={orderByDirection}
            clearable={false}
            onChange={(value) => {
              if (value === null) {
                return;
              }
              onOrderByDirectionChange(value);
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
