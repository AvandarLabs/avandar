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
import { getManualQueryLimitValue } from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { ManualQueryLargeDatasetLimitHint } from "@/views/DataExplorerApp/QueryForm/ManualQueryLargeDatasetLimitHint/ManualQueryLargeDatasetLimitHint";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import { useManualQueryDataSourceChange } from "@/views/DataExplorerApp/QueryForm/useManualQueryDataSourceChange";
import classes from "./ManualQueryForm.module.css";
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
import type { ReactNode } from "react";

/**
 * Returns the localized order direction options for the manual query form.
 * Defined as a hook so the labels can use the active translation function.
 */
function useOrderDirectionOptions(): SelectData<OrderByDirection> {
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
 * (via `structuredQueryToSql`) and update sync metadata.
 */
export type ManualQuerySetDataSourceOptions = {
  /** Applied atomically with the data source so the first query is bounded. */
  limit?: number;
};

export type ManualQueryFormHandlers = {
  onSetDataSource: (
    dataSource: QueryDataSource | undefined,
    options?: ManualQuerySetDataSourceOptions,
  ) => void;
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

type PendingChange =
  | { kind: "filter"; nextFilter: QueryFilterGroup }
  | undefined;

export function ManualQueryForm(props: Props): ReactNode {
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
}): ReactNode {
  const [{ query, isStructuredQueryInSync }, dispatch] =
    DataExplorerStateManager.useContext();

  const handlers: ManualQueryFormHandlers = {
    onSetDataSource: (dataSource, options) => {
      dispatch.setDataSource({ dataSource, options });
    },
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
}): ReactNode {
  const { t } = useLingui();
  const orderDirectionOptions = useOrderDirectionOptions();
  const {
    dataSource,
    queryColumns,
    aggregations,
    orderByColumn,
    orderByDirection,
    filters,
  } = query;
  const limit = getManualQueryLimitValue(query);

  const [pendingChange, setPendingChange] = useState<PendingChange>(undefined);
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
    <div>
      <Stack px="sm">
        {pendingChange ?
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="yellow"
            variant="light"
            title={t`Overwrite SQL?`}
            withCloseButton
            onClose={() => {
              setPendingChange(undefined);
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
                  setPendingChange(undefined);
                }}
                data-testid="overwrite-sql-confirm"
                className={classes.unstyledButton}
              >
                <Trans>Overwrite SQL with form changes</Trans>
              </Text>
              <Text
                component="button"
                type="button"
                size="xs"
                c="dimmed"
                onClick={() => {
                  setPendingChange(undefined);
                }}
                data-testid="overwrite-sql-cancel"
                className={classes.unstyledButton}
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
            className={classes.fieldsetTranslucent}
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
          className={classes.fieldsetTranslucent}
        >
          <QueryFiltersField
            columns={queryColumns}
            value={filters}
            onChange={onFiltersChange}
          />
        </Fieldset>

        <Fieldset legend={t`Sort by`} className={classes.fieldsetTranslucent}>
          <Select
            clearable
            label={t`Column`}
            data={selectedColumnOptions}
            value={orderByColumn}
            placeholder={t`Select column to sort by`}
            disabled={selectedColumnOptions.length === 0}
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
          className={classes.fieldsetTranslucent}
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
    </div>
  );
}
