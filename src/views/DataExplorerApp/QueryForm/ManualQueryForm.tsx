import { Alert, Fieldset, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Model } from "@models";
import { makeSelectOptions, Select } from "@ui";
import { prop } from "@utils";
import { QueryColumn as QueryColumnModule } from "$/models/queries/QueryColumn/QueryColumn";
import { useState } from "react";
import { AggregationSelect } from "@/views/DataExplorerApp/AggregationSelect";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField";
import type { SelectData } from "@ui";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryColumnRead } from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";

const HIDE_LIMIT = true;

const orderDirectionOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const satisfies SelectData<string>;

type Props = {
  withinPortal?: boolean;
};

type PendingChange =
  | { kind: "filter"; nextFilter: QueryFilterGroup }
  | null;

export function ManualQueryForm({ withinPortal = true }: Props): JSX.Element {
  const [{ query, isStructuredQueryInSync }, dispatch] =
    DataExplorerStateManager.useContext();
  const {
    dataSource,
    queryColumns,
    aggregations,
    orderByColumn,
    orderByDirection,
    filters,
  } = query;

  const [pendingChange, setPendingChange] = useState<PendingChange>(null);

  const selectedColumnOptions = makeSelectOptions(queryColumns, {
    valueFn: prop("id"),
    labelFn: (col) => {
      return QueryColumnModule.getDerivedColumnName(col);
    },
  });

  const onFiltersChange = (next: QueryFilterGroup): void => {
    if (!isStructuredQueryInSync) {
      setPendingChange({ kind: "filter", nextFilter: next });
      return;
    }
    dispatch.setFilters(next);
  };

  return (
    <form>
      <Stack px="sm">
        {pendingChange ?
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="yellow"
            variant="light"
            title="Overwrite SQL?"
            withCloseButton
            onClose={() => {
              setPendingChange(null);
            }}
            data-testid="overwrite-sql-warning"
          >
            <Text size="xs" mb="xs">
              The current SQL contains parts that the form could not
              represent. Continuing will overwrite that SQL with one
              generated from the form. This cannot be undone (unless you
              re-run your previous chat prompt).
            </Text>
            <Stack gap="xs">
              <Text
                component="button"
                type="button"
                size="xs"
                fw={600}
                c="red"
                onClick={() => {
                  if (pendingChange.kind === "filter") {
                    dispatch.setFilters(pendingChange.nextFilter);
                  }
                  setPendingChange(null);
                }}
                data-testid="overwrite-sql-confirm"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                }}
              >
                Overwrite SQL with form changes
              </Text>
              <Text
                component="button"
                type="button"
                size="xs"
                c="dimmed"
                onClick={() => {
                  setPendingChange(null);
                }}
                data-testid="overwrite-sql-cancel"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                }}
              >
                Keep SQL as-is
              </Text>
            </Stack>
          </Alert>
        : null}

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
          onChange={(newColumns: readonly QueryColumnRead[]) => {
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
                  onChange={(newAggregation: QueryAggregationType.T) => {
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

        <Fieldset
          legend="Filters (Where)"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
        >
          <QueryFiltersField
            columns={queryColumns}
            value={filters}
            onChange={onFiltersChange}
          />
        </Fieldset>

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
