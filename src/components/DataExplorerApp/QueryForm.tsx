import { Fieldset, Stack, Text } from "@mantine/core";
import { match } from "ts-pattern";
import { Select, SelectData } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { makeObject } from "@/lib/utils/objects/builders";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { QueryAggregationType } from "@/models/queries/QueryAggregationType";
import { AggregationSelect } from "./AggregationSelect";
import { DataExplorerStore } from "./DataExplorerStore";
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

function makeDataSourceIdWithType(
  dataSource: QueryableDataSource,
): QueryableDataSourceIdWithType {
  return match(dataSource)
    .with({ type: "Dataset" }, (d) => {
      return { type: d.type, id: d.object.id };
    })
    .with({ type: "EntityConfig" }, (ec) => {
      return { type: ec.type, id: ec.object.id };
    })
    .exhaustive();
}

export function QueryForm(): JSX.Element {
  const [{ query }, dispatch] = DataExplorerStore.use();
  const {
    dataSource,
    queryColumns,
    aggregations,
    orderByColumn,
    orderByDirection,
  } = query;

  const fieldOptionsById = makeSelectOptions(queryColumns, {
    valueFn: prop("column.id"),
    labelFn: prop("column.name"),
  });

  return (
    <form>
      <Stack>
        <QueryableDataSourceSelect
          value={dataSource ?? null}
          onChange={(newDataSource) => {
            dispatch.setDataSource(newDataSource ?? undefined);
          }}
        />

        <QueryableColumnMultiSelect
          label="Select columns"
          placeholder="Select columns to query"
          dataSourceId={
            dataSource ? makeDataSourceIdWithType(dataSource) : undefined
          }
          value={queryColumns}
          onChange={(newColumns: readonly QueryableColumn[]) => {
            dispatch.setColumns(newColumns);
            const newColumnIds = newColumns.map(prop("column.id"));
            const newAggregations = makeObject(newColumnIds, {
              valueFn: (colId) => {
                // if this column already had an aggregation we keep it
                return aggregations[colId] ?? "none";
              },
            });
            dispatch.setAggregations(newAggregations);
          }}
        />

        {queryColumns.length > 0 ?
          <Fieldset
            legend="Aggregations"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
          >
            {queryColumns.map((col) => {
              return (
                <AggregationSelect
                  key={col.column.id}
                  label={col.column.name}
                  dataType={
                    col.type === "DatasetColumn" ?
                      col.column.dataType
                    : col.column.options.baseDataType
                  }
                  value={aggregations[col.column.id] ?? "none"}
                  onChange={(newAggregation: QueryAggregationType) => {
                    dispatch.setColumnAggregation({
                      columnId: col.column.id,
                      aggregation: newAggregation,
                    });
                  }}
                />
              );
            })}
          </Fieldset>
        : null}

        {HIDE_WHERE ? null : <Text>Where (react-awesome-query-builder)</Text>}

        <Fieldset
          legend="Sort by"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
        >
          <Select
            clearable
            label="Column"
            data={fieldOptionsById}
            value={orderByColumn}
            placeholder="Select column to sort by"
            onChange={(newColId) => {
              dispatch.setOrderByColumn(newColId ?? undefined);
            }}
          />
          <Select
            clearable={false}
            label="Direction"
            placeholder="Select sort order"
            data={orderDirectionOptions}
            value={orderByDirection}
            onChange={(value) => {
              dispatch.setOrderByDirection(value ?? undefined);
            }}
          />
        </Fieldset>

        {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}
      </Stack>
    </form>
  );
}
