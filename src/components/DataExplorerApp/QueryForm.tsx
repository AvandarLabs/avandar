import { Box, Fieldset, Stack, Text } from "@mantine/core";
import { match } from "ts-pattern";
import { QueryAggregationType } from "@/clients/DuckDBClient/types";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { difference } from "@/lib/utils/arrays/misc";
import { makeObject } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys, omit } from "@/lib/utils/objects/misc";
import { AggregationSelect } from "./AggregationSelect";
import {
  QueryableColumn,
  QueryableColumnMultiSelect,
} from "./QueryableColumnMultiSelect";
import {
  QueryableDataSource,
  QueryableDataSourceIdWithType,
  QueryableDataSourceSelect,
} from "./QueryableDataSourceSelect";

const HIDE_WHERE = true;
const HIDE_LIMIT = true;

type Direction = "asc" | "desc";

const orderDirectionOptions: Array<{ value: Direction; label: string }> = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const;

type Props = {
  errorMessage?: string;
  aggregations: Record<string, QueryAggregationType>;
  selectedDataSource: QueryableDataSource | undefined;
  selectedColumns: readonly QueryableColumn[];
  selectedGroupByColumns: readonly QueryableColumn[];
  orderByColumn: QueryableColumn | undefined;
  orderByDirection: Direction;
  onAggregationsChange: (next: Record<string, QueryAggregationType>) => void;
  onSelectDataSourceChange: (
    dataSourceId: QueryableDataSource | undefined,
  ) => void;
  onSelectColumnsChange: (columns: readonly QueryableColumn[]) => void;
  onGroupByChange: (columns: readonly QueryableColumn[]) => void;
  onOrderByColumnChange: (column: QueryableColumn | undefined) => void;
  onOrderByDirectionChange: (dir: Direction) => void;
};

function getDataSourceIdWithType(
  dataSource: QueryableDataSource,
): QueryableDataSourceIdWithType {
  return match(dataSource)
    .with({ type: "Dataset" }, (d) => {
      return { type: d.type, id: d.value.id };
    })
    .with({ type: "EntityConfig" }, (ec) => {
      return { type: ec.type, id: ec.value.id };
    })
    .exhaustive();
}

export function QueryForm({
  errorMessage,
  aggregations,
  selectedColumns,
  selectedGroupByColumns,
  selectedDataSource,
  orderByColumn,
  orderByDirection,
  onAggregationsChange,
  onSelectDataSourceChange,
  onSelectColumnsChange,
  onGroupByChange,
  onOrderByColumnChange,
  onOrderByDirectionChange,
}: Props): JSX.Element {
  const fieldOptionsById = makeSelectOptions(selectedColumns, {
    valueFn: getProp("value.id"),
    labelFn: getProp("value.name"),
  });

  const orderByColumnId = orderByColumn?.value.id ?? null;

  return (
    <form>
      <Stack>
        <QueryableDataSourceSelect
          value={selectedDataSource ?? null}
          onChange={(dataSource) => {
            onSelectDataSourceChange(dataSource ?? undefined);
          }}
        />

        <QueryableColumnMultiSelect
          label="Select columns"
          placeholder="Select columns"
          dataSourceId={
            selectedDataSource ?
              getDataSourceIdWithType(selectedDataSource)
            : undefined
          }
          value={selectedColumns}
          onChange={(columns: readonly QueryableColumn[]) => {
            onSelectColumnsChange(columns);
            const incomingFieldNames = columns.map(getProp("value.name"));
            const prevAggregations = aggregations;
            const prevFieldNames = objectKeys(prevAggregations);
            const droppedFieldNames = difference(
              prevFieldNames,
              incomingFieldNames,
            );

            const defaults = makeObject(incomingFieldNames, {
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
                  key={col.value.id}
                  column={col}
                  value={aggregations[col.value.name] ?? "none"}
                  onChange={(agg: QueryAggregationType) => {
                    onAggregationsChange({
                      ...aggregations,
                      [col.value.name]: agg,
                    });
                  }}
                />
              );
            })}
          </Fieldset>
        : null}

        {HIDE_WHERE ? null : <Text>Where (react-awesome-query-builder)</Text>}

        <QueryableColumnMultiSelect
          label="Group by"
          placeholder="Group by"
          dataSourceId={
            selectedDataSource ?
              getDataSourceIdWithType(selectedDataSource)
            : undefined
          }
          value={selectedGroupByColumns}
          onChange={(cols) => {
            onGroupByChange(cols);
          }}
        />

        <Select
          label="Order field"
          data={fieldOptionsById}
          value={orderByColumnId}
          onChange={(newColId) => {
            if (newColId === null) {
              onOrderByColumnChange(undefined);
              return;
            }
            const newOrderByColumn = selectedColumns.find((col) => {
              return col.value.id === newColId;
            });
            onOrderByColumnChange(newOrderByColumn);
          }}
          clearable
        />
        <Box mb="md">
          <Select
            label="Order by"
            placeholder="Select order"
            data={orderDirectionOptions}
            value={orderByDirection}
            clearable={false}
            onChange={(value) => {
              if (value !== null) {
                onOrderByDirectionChange(value);
              }
            }}
          />
        </Box>

        {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}
        {errorMessage ?
          <DangerText>{errorMessage}</DangerText>
        : null}
      </Stack>
    </form>
  );
}
