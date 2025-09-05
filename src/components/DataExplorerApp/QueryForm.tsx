import { Box, Fieldset, Select, Stack, Text } from "@mantine/core";
import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { difference } from "@/lib/utils/arrays";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys, omit } from "@/lib/utils/objects/misc";
import { setValue } from "@/lib/utils/objects/setValue";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { DatasetSelect } from "../common/DatasetSelect";
import { AggregationSelect } from "./AggregationSelect";
import { DatasetColumnMultiSelect } from "./DatasetColumnMultiSelect";

const HIDE_WHERE = true;
const HIDE_LIMIT = true;

const orderOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const;

type Direction = "asc" | "desc";

type Props = {
  errorMessage: string | undefined;
  aggregations: Record<string, QueryAggregationType>;
  selectedDatasetId: DatasetId | undefined;
  selectedColumns: readonly DatasetColumn[];
  selectedGroupByColumns: readonly DatasetColumn[];
  orderByColumn: DatasetColumn | undefined;
  orderByDirection: Direction;
  onAggregationsChange: (
    newAggregations: Record<string, QueryAggregationType>,
  ) => void;
  onFromDatasetChange: (datasetId: DatasetId | undefined) => void;
  onSelectColumnsChange: (columns: readonly DatasetColumn[]) => void;
  onGroupByChange: (columns: readonly DatasetColumn[]) => void;
  onOrderByColumnChange: (field: DatasetColumn | undefined) => void;
  onOrderByDirectionChange: (value: "asc" | "desc") => void;
};

export function QueryForm({
  errorMessage,
  aggregations,
  selectedColumns,
  selectedGroupByColumns,
  selectedDatasetId,
  orderByColumn,
  onAggregationsChange,
  onFromDatasetChange,
  onSelectColumnsChange,
  onGroupByChange,
  orderByDirection,
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

            const prevAggregations = aggregations;
            const incomingFieldNames = columns.map(getProp("name"));
            const prevFieldNames = objectKeys(prevAggregations);
            const droppedFieldNames = difference(
              prevFieldNames,
              incomingFieldNames,
            );

            const newDefaultAggregations = makeObjectFromList(
              incomingFieldNames,
              { defaultValue: "none" as const },
            );

            onAggregationsChange(
              omit(
                { ...newDefaultAggregations, ...prevAggregations },
                droppedFieldNames,
              ),
            );
          }}
        />

        {selectedColumns.length > 0 ?
          <Fieldset
            legend="Aggregations"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
          >
            {selectedColumns.map((field) => {
              return (
                <AggregationSelect
                  key={field.id}
                  column={field}
                  onChange={(aggregationType) => {
                    const newAggregations = setValue(
                      aggregations,
                      field.name,
                      aggregationType,
                    );
                    onAggregationsChange(newAggregations);
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
          onChange={onGroupByChange}
          datasetId={selectedDatasetId}
          value={selectedGroupByColumns}
        />

        <Select
          label="Select field"
          placeholder="Select field"
          data={selectedColumns.map((f) => {
            return {
              value: f.name,
              label: f.name,
            };
          })}
          value={orderByColumn?.name}
          onChange={(fieldName) => {
            const selected = selectedColumns.find((f) => {
              return f.name === fieldName;
            });
            onOrderByColumnChange(selected);
          }}
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

          {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}
          {errorMessage ?
            <DangerText>{errorMessage}</DangerText>
          : null}
        </Box>
      </Stack>
    </form>
  );
}
