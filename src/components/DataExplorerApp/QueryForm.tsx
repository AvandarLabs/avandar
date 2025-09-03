import { Box, Fieldset, Select, Stack, Text } from "@mantine/core";
import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
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

const orderOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const;

type Direction = "asc" | "desc";

type Props = {
  errorMessage?: string;
  aggregations: Record<string, QueryAggregationType>;
  selectedDatasetId: DatasetId | undefined;

  // develop names
  selectedColumns: readonly DatasetColumn[];
  selectedGroupByColumns: readonly DatasetColumn[];
  orderByColumn: DatasetColumn | undefined;
  orderByDirection: Direction;

  onAggregationsChange: (next: Record<string, QueryAggregationType>) => void;
  onFromDatasetChange: (datasetId: DatasetId | undefined) => void;

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
  onFromDatasetChange,
  onSelectColumnsChange,
  onGroupByChange,
  onOrderByColumnChange,
  onOrderByDirectionChange,
}: Props): JSX.Element {
  return (
    <form>
      <Stack>
        <DatasetSelect
          value={selectedDatasetId ?? null}
          onChange={(datasetId) => {
            onFromDatasetChange(datasetId ?? undefined);
          }}
        />

        <DatasetColumnMultiSelect
          label="Select fields"
          placeholder="Select fields"
          datasetId={selectedDatasetId}
          value={selectedColumns}
          onChange={(columns) => {
            onSelectColumnsChange(columns);

            // keep aggregations in sync with current columns
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
          onChange={onGroupByChange}
        />

        <Select
          label="Select field"
          placeholder="Select field"
          data={selectedColumns.map((f) => {
            return { value: f.name, label: f.name };
          })}
          value={orderByColumn?.name ?? null}
          onChange={(fieldName) => {
            const selected = selectedColumns.find((f) => {
              return f.name === fieldName;
            });
            onOrderByColumnChange(selected);
          }}
          clearable
        />
        <Box mb="md">
          <Select
            label="Order by"
            placeholder="Select order"
            data={orderOptions}
            value={orderByDirection}
            clearable={false}
            onChange={(value) => {
              onOrderByDirectionChange(value as Direction);
            }}
          />
        </Box>

        <Select
          label="Order by"
          placeholder="Select order"
          data={
            orderOptions as unknown as Array<{
              value: string;
              label: string;
            }>
          }
          value={orderByDirection}
          clearable={false}
          onChange={(value) => {
            if (value) {
              onOrderByDirectionChange(value as Direction);
            }
          }}
        />

        {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}

        {errorMessage ?
          <DangerText>{errorMessage}</DangerText>
        : null}
      </Stack>
    </form>
  );
}
