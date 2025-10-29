import { Fieldset, Stack, Text } from "@mantine/core";
import { Select, SelectData } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { isOfModelType } from "@/lib/utils/guards/guards";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { Models } from "@/models/Model/Models";
import { QueryAggregationType } from "@/models/queries/QueryAggregationType";
import { QueryColumn, QueryColumns } from "@/models/queries/QueryColumn";
import { AggregationSelect } from "./AggregationSelect";
import { DataExplorerStore } from "./DataExplorerStore";
import { QueryColumnMultiSelect } from "./QueryColumnMultiSelect";
import { QueryDataSourceSelect } from "./QueryDataSourceSelect";

const HIDE_WHERE = true;
const HIDE_LIMIT = true;

const orderDirectionOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const satisfies SelectData<string>;

export function QueryForm(): JSX.Element {
  const [{ query }, dispatch] = DataExplorerStore.use();
  const {
    dataSource,
    queryColumns,
    aggregations,
    orderByColumn,
    orderByDirection,
  } = query;

  const selectedColumnOptions = makeSelectOptions(queryColumns, {
    valueFn: prop("id"),
    labelFn: (col) => {
      return QueryColumns.getDerivedColumnName(col);
    },
  });

  return (
    <form>
      <Stack>
        <QueryDataSourceSelect
          value={dataSource ?? null}
          onChange={(newDataSource) => {
            dispatch.setDataSource(newDataSource ?? undefined);
          }}
        />

        <QueryColumnMultiSelect
          label="Select columns"
          placeholder="Select columns to query"
          dataSourceId={dataSource ? Models.getTypedId(dataSource) : undefined}
          value={queryColumns}
          onChange={(newColumns: readonly QueryColumn[]) => {
            dispatch.setColumns(newColumns);
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
                  key={col.id}
                  label={col.baseColumn.name}
                  dataType={
                    isOfModelType("DatasetColumn", col.baseColumn) ?
                      col.baseColumn.dataType
                    : col.baseColumn.options.baseDataType
                  }
                  value={aggregations[col.id] ?? "none"}
                  onChange={(newAggregation: QueryAggregationType) => {
                    dispatch.setColumnAggregation({
                      columnId: col.id,
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
            data={selectedColumnOptions}
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
