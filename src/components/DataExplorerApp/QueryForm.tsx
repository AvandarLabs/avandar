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
import { OrderByDirection } from "./DataExplorerContext/types";
import { DatasetColumnMultiSelect } from "./DatasetColumnMultiSelect";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { DatasetColumn } from "@/models/datasets/DatasetColumn";

const HIDE_WHERE = true;
const HIDE_LIMIT = true;

const orderDirectionOptions: Array<{ value: OrderByDirection; label: string }> =
  [
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
  orderByDirection: OrderByDirection;

  onAggregationsChange: (next: Record<string, QueryAggregationType>) => void;
  onSelectDatasetChange: (datasetId: DatasetId | undefined) => void;

  onSelectColumnsChange: (columns: readonly DatasetColumn[]) => void;
  onGroupByChange: (columns: readonly DatasetColumn[]) => void;
  onOrderByColumnChange: (column: DatasetColumn | undefined) => void;
  onOrderByDirectionChange: (dir: OrderByDirection) => void;
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

  const orderByColumnId = orderByColumn?.id ?? null;

  const builderTouched =
    selectedColumns.length > 0 ||
    (selectedGroupByColumns?.length ?? 0) > 0 ||
    orderByDirection != null;

  const showEmptyFieldsError = selectedColumns.length === 0 && builderTouched;
  console.log("ORDER BY:", { orderByColumn, orderByDirection });

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

            const incomingFieldNames = columns.map(getProp("name"));
            const prevAggregations = aggregations;
            const prevFieldNames = objectKeys(prevAggregations);
            const droppedFieldNames = difference(
              prevFieldNames,
              incomingFieldNames,
            );

            const defaults = makeObjectFromList(incomingFieldNames, {
              defaultValue: "none" as const,
            });

            onAggregationsChange(
              omit({ ...defaults, ...prevAggregations }, droppedFieldNames),
            );
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
                  onChange={(agg: QueryAggregationType) => {
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

        <Select
          label="Order field"
          placeholder="Select field"
          data={fieldOptionsById}
          value={
            (
              fieldOptionsById.some((opt) => {
                return opt.value === orderByColumn?.id;
              })
            ) ?
              orderByColumn?.id
            : null
          }
          onChange={(newFieldId) => {
            if (!newFieldId) {
              onOrderByColumnChange(undefined);
              return;
            }
            const col = selectedColumns.find((f) => {
              return f.id === newFieldId;
            });
            onOrderByColumnChange(col);
          }}
          clearable
        />
        <Box mb="md">
          <Select
            label="Order by"
            placeholder="Select order"
            data={orderDirectionOptions}
            value={
              (
                orderDirectionOptions.some((opt) => {
                  return opt.value === orderByDirection;
                })
              ) ?
                orderByDirection
              : null
            }
            onChange={(val) => {
              onOrderByDirectionChange((val as OrderByDirection) ?? null);
            }}
            clearable={false}
          />

          {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}
          {showEmptyFieldsError ?
            <DangerText>
              At least one column must be selected to build a query.
            </DangerText>
          : null}

          {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}
          {errorMessage ?
            <DangerText>{errorMessage}</DangerText>
          : null}
        </Box>
      </Stack>
    </form>
  );
}
