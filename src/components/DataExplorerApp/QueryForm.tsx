import { Fieldset, Stack, Text } from "@mantine/core";
import { match } from "ts-pattern";
import { QueryAggregationType } from "@/clients/DuckDBClient/types";
import { Select, SelectData } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { DangerText } from "@/lib/ui/text/DangerText";
import { difference } from "@/lib/utils/arrays/misc";
import { makeObject } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys, omit } from "@/lib/utils/objects/misc";
import { AggregationSelect } from "./AggregationSelect";
import { OrderByDirection } from "./DataExplorerContext/types";
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

const orderDirectionOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const satisfies SelectData<string>;

type Props = {
  errorMessage: string | undefined;
  aggregations: Record<string, QueryAggregationType>;
  selectedFromDataSource: QueryableDataSource | undefined;
  selectedColumns: readonly QueryableColumn[];
  selectedGroupByColumns: readonly QueryableColumn[];
  orderByColumn: QueryableColumn | undefined;
  orderByDirection: OrderByDirection | undefined;
  onAggregationsChange: (next: Record<string, QueryAggregationType>) => void;
  onFromDataSourceChange: (
    dataSourceId: QueryableDataSource | undefined,
  ) => void;
  onSelectColumnsChange: (columns: readonly QueryableColumn[]) => void;
  onGroupByChange: (columns: readonly QueryableColumn[]) => void;
  onOrderByColumnChange: (column: QueryableColumn | undefined) => void;
  onOrderByDirectionChange: (dir: OrderByDirection) => void;
};

function makeDataSourceIdWithType(
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
  selectedFromDataSource,
  orderByColumn,
  orderByDirection,
  onAggregationsChange,
  onFromDataSourceChange,
  onSelectColumnsChange,
  onGroupByChange,
  onOrderByColumnChange,
  onOrderByDirectionChange,
}: Props): JSX.Element {
  const fieldOptionsById = makeSelectOptions(selectedColumns, {
    valueFn: getProp("value.id"),
    labelFn: getProp("value.name"),
  });
  const builderTouched =
    selectedColumns.length > 0 ||
    (selectedGroupByColumns?.length ?? 0) > 0 ||
    orderByDirection != null;

  const showEmptyFieldsError = selectedColumns.length === 0 && builderTouched;
  const orderByColumnId = orderByColumn?.value.id ?? null;

  return (
    <form>
      <Stack>
        <QueryableDataSourceSelect
          value={selectedFromDataSource ?? null}
          onChange={(dataSource) => {
            onFromDataSourceChange(dataSource ?? undefined);
          }}
        />

        <QueryableColumnMultiSelect
          label="Select columns"
          placeholder="Select columns to query"
          dataSourceId={
            selectedFromDataSource ?
              makeDataSourceIdWithType(selectedFromDataSource)
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
            const newDefaultAggregations = makeObject(incomingFieldNames, {
              defaultValue: "none" as const,
            });

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
          placeholder="Select columns to group results by"
          dataSourceId={
            selectedFromDataSource ?
              makeDataSourceIdWithType(selectedFromDataSource)
            : undefined
          }
          value={selectedGroupByColumns}
          onChange={onGroupByChange}
        />

        <Fieldset
          legend="Sort by"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
        >
          <Select
            label="Column"
            data={fieldOptionsById}
            value={orderByColumnId}
            placeholder="Select column to sort by"
            onChange={(newColId) => {
              const newOrderByColumn = selectedColumns.find((col) => {
                return col.value.id === newColId;
              });
              onOrderByColumnChange(newOrderByColumn);
            }}
            clearable
          />
          <Select
            label="Direction"
            placeholder="Select sort order"
            data={orderDirectionOptions}
            value={orderByDirection}
            onChange={(value) => {
              onOrderByDirectionChange((value as OrderByDirection) ?? null);
            }}
            clearable={false}
          />
        </Fieldset>

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
      </Stack>
    </form>
  );
}
