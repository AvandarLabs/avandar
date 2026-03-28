import { Fieldset, Stack, Text } from "@mantine/core";
import { Model } from "@models/Model/Model";
import { makeSelectOptions } from "@ui/inputs/Select/makeSelectOptions";
import { prop } from "@utils/objects/hofs/prop/prop";
import { QueryColumns } from "$/models/queries/QueryColumn/QueryColumns";
import { Select, type SelectData } from "@ui/inputs/Select/Select";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { AggregationSelect } from "@/views/DataExplorerApp/AggregationSelect";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.types";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.types";

const HIDE_WHERE = true;
const HIDE_LIMIT = true;

const orderDirectionOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const satisfies SelectData<string>;

type Props = {
  withinPortal?: boolean;
};

export function ManualQueryForm({ withinPortal = true }: Props): JSX.Element {
  const [{ query }, dispatch] = DataExplorerStateManager.useContext();
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
          comboboxProps={{ withinPortal }}
        />

        <QueryColumnMultiSelect
          label="Select columns"
          placeholder="Select columns to query"
          dataSourceId={dataSource ? Model.getTypedId(dataSource) : undefined}
          value={queryColumns}
          onChange={(newColumns: readonly QueryColumn[]) => {
            dispatch.setColumns(newColumns);
          }}
          comboboxProps={{ withinPortal }}
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
                  dataType={col.baseColumn.dataType}
                  value={aggregations[col.id] ?? "none"}
                  onChange={(newAggregation: QueryAggregationType) => {
                    dispatch.setColumnAggregation({
                      columnId: col.id,
                      aggregation: newAggregation,
                    });
                  }}
                  comboboxProps={{ withinPortal }}
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
            comboboxProps={{ withinPortal }}
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
            comboboxProps={{ withinPortal }}
          />
        </Fieldset>

        {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}
      </Stack>
    </form>
  );
}
