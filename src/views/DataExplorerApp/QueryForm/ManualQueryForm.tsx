import { Trans, useLingui } from "@lingui/react/macro";
import {
  Alert,
  Fieldset,
  Group,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";
import { Model } from "@models";
import { IconAlertTriangle } from "@tabler/icons-react";
import { makeSelectOptions, Select } from "@ui";
import { prop } from "@utils";
import { QueryColumn as QueryColumnModule } from "$/models/queries/QueryColumn/QueryColumn";
import { useState } from "react";
import { AggregationSelect } from "@/views/DataExplorerApp/AggregationSelect";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { getManualQueryLimitValue } from "@/views/DataExplorerApp/manualQueryLimit";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { ManualQueryLargeDatasetLimitHint } from "@/views/DataExplorerApp/QueryForm/ManualQueryLargeDatasetLimitHint";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField";
import { useManualQueryDataSourceChange } from "@/views/DataExplorerApp/QueryForm/useManualQueryDataSourceChange";
import type { SelectData } from "@ui";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type {
  OrderByDirection,
  PartialStructuredQuery,
} from "$/models/queries/StructuredQuery/StructuredQuery.types";

/**
 * Returns the localized order direction options for the manual query form.
 * Defined as a hook so the labels can use the active translation function.
 */
function _useOrderDirectionOptions(): SelectData<OrderByDirection> {
  const { t } = useLingui();
  return [
    { value: "asc", label: t`Ascending` },
    { value: "desc", label: t`Descending` },
  ];
}

/**
 * Callbacks invoked when the user changes the form. Mirrors the action set on
 * `DataExplorerStateManager` so both Data Explorer and dashboard editors can
 * drive this form. Implementations are expected to regenerate the raw SQL
 * (via `structuredQueryToSQL`) and update sync metadata.
 */
export type ManualQueryFormHandlers = {
  onSetDataSource: (dataSource: QueryDataSource | undefined) => void;
  onSetColumns: (columns: readonly QueryColumn.T[]) => void;
  onSetColumnAggregation: (payload: {
    columnId: QueryColumn.Id;
    aggregation: QueryAggregationType.T;
  }) => void;
  onSetOrderByColumn: (columnId: QueryColumnId | undefined) => void;
  onSetOrderByDirection: (direction: OrderByDirection | undefined) => void;
  onSetLimit: (limit: number | undefined) => void;
  onSetFilters: (filters: QueryFilterGroup) => void;
};

type ControlledProps = {
  /**
   * Controlled mode — when omitted, the form reads from the global
   * `DataExplorerStateManager` (legacy Data Explorer wiring).
   */
  query: PartialStructuredQuery;
  isStructuredQueryInSync: boolean;
  handlers: ManualQueryFormHandlers;
  withinPortal?: boolean;
};

type LegacyProps = {
  query?: undefined;
  isStructuredQueryInSync?: undefined;
  handlers?: undefined;
  withinPortal?: boolean;
};

type Props = ControlledProps | LegacyProps;

type PendingChange = { kind: "filter"; nextFilter: QueryFilterGroup } | null;

export function ManualQueryForm(props: Props): JSX.Element {
  const { withinPortal = true } = props;
  if (props.query !== undefined) {
    return (
      <ManualQueryFormView
        query={props.query}
        isStructuredQueryInSync={props.isStructuredQueryInSync}
        handlers={props.handlers}
        withinPortal={withinPortal}
      />
    );
  }
  return <DataExplorerManualQueryForm withinPortal={withinPortal} />;
}

/**
 * Legacy wrapper that wires the form to the global Data Explorer state
 * manager. Kept so existing callers in the Data Explorer don't have to
 * thread state and handlers through props.
 */
function DataExplorerManualQueryForm({
  withinPortal,
}: {
  withinPortal: boolean;
}): JSX.Element {
  const [{ query, isStructuredQueryInSync }, dispatch] =
    DataExplorerStateManager.useContext();

  const handlers: ManualQueryFormHandlers = {
    onSetDataSource: dispatch.setDataSource,
    onSetColumns: dispatch.setColumns,
    onSetColumnAggregation: dispatch.setColumnAggregation,
    onSetOrderByColumn: dispatch.setOrderByColumn,
    onSetOrderByDirection: dispatch.setOrderByDirection,
    onSetLimit: dispatch.setLimit,
    onSetFilters: dispatch.setFilters,
  };

  return (
    <ManualQueryFormView
      query={query}
      isStructuredQueryInSync={isStructuredQueryInSync}
      handlers={handlers}
      withinPortal={withinPortal}
    />
  );
}

function ManualQueryFormView({
  query,
  isStructuredQueryInSync,
  handlers,
  withinPortal,
}: {
  query: PartialStructuredQuery;
  isStructuredQueryInSync: boolean;
  handlers: ManualQueryFormHandlers;
  withinPortal: boolean;
}): JSX.Element {
  const { t } = useLingui();
  const orderDirectionOptions = _useOrderDirectionOptions();
  const {
    dataSource,
    queryColumns,
    aggregations,
    orderByColumn,
    orderByDirection,
    filters,
  } = query;
  const limit = getManualQueryLimitValue(query);

  const [pendingChange, setPendingChange] = useState<PendingChange>(null);
  const {
    onDataSourceChange,
    isLargeDatasetLimitHintVisible,
    dismissLargeDatasetLimitHint,
  } = useManualQueryDataSourceChange({ query, handlers });

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
    handlers.onSetFilters(next);
  };

  return (
    <form>
      <Stack px="sm">
        {pendingChange ?
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="yellow"
            variant="light"
            title={t`Overwrite SQL?`}
            withCloseButton
            onClose={() => {
              setPendingChange(null);
            }}
            data-testid="overwrite-sql-warning"
          >
            <Text size="xs" mb="xs">
              <Trans>
                The current SQL contains parts that the form could not
                represent. Continuing will overwrite that SQL with one generated
                from the form. This cannot be undone (unless you re-run your
                previous chat prompt).
              </Trans>
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
                    handlers.onSetFilters(pendingChange.nextFilter);
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
                <Trans>Overwrite SQL with form changes</Trans>
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
                <Trans>Keep SQL as-is</Trans>
              </Text>
            </Stack>
          </Alert>
        : null}

        <QueryDataSourceSelect
          value={dataSource ?? null}
          onChange={onDataSourceChange}
          comboboxProps={{ withinPortal }}
        />

        <QueryColumnMultiSelect
          label={t`Select columns`}
          placeholder={t`Select columns to query`}
          dataSourceId={dataSource ? Model.getTypedId(dataSource) : undefined}
          value={queryColumns}
          onChange={(newColumns: readonly QueryColumnRead[]) => {
            handlers.onSetColumns(newColumns);
          }}
          comboboxProps={{ withinPortal }}
        />

        {queryColumns.length > 0 ?
          <Fieldset
            legend={t`Aggregations`}
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
                    handlers.onSetColumnAggregation({
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
          legend={t`Filters (Where)`}
          style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
        >
          <QueryFiltersField
            columns={queryColumns}
            value={filters}
            onChange={onFiltersChange}
          />
        </Fieldset>

        <Fieldset
          legend={t`Sort by`}
          style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
        >
          <Select
            clearable
            label={t`Column`}
            data={selectedColumnOptions}
            value={orderByColumn}
            placeholder={t`Select column to sort by`}
            onChange={(newColId) => {
              handlers.onSetOrderByColumn(newColId ?? undefined);
            }}
            comboboxProps={{ withinPortal }}
          />
          <Select
            clearable={false}
            label={t`Direction`}
            placeholder={t`Select sort order`}
            data={orderDirectionOptions}
            value={orderByDirection}
            onChange={(value) => {
              handlers.onSetOrderByDirection(value ?? undefined);
            }}
            comboboxProps={{ withinPortal }}
          />
        </Fieldset>

        <Fieldset
          legend={t`Result size`}
          style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
        >
          <Group align="flex-end" wrap="nowrap" gap="sm">
            <NumberInput
              label={t`Limit`}
              placeholder={t`Maximum rows to return`}
              min={1}
              step={1}
              style={{ flex: 1 }}
              value={typeof limit === "number" ? limit : ""}
              onChange={(value) => {
                dismissLargeDatasetLimitHint();
                handlers.onSetLimit(
                  typeof value === "number" ? value : undefined,
                );
              }}
            />
            <ManualQueryLargeDatasetLimitHint
              visible={isLargeDatasetLimitHintVisible}
            />
          </Group>
        </Fieldset>
      </Stack>
    </form>
  );
}
