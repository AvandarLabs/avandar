/**
 * The individual field blocks of the manual query form. Extracted so the form
 * can render them either as a vertical stack of fieldsets or as reflowing
 * columns without duplicating any control markup.
 */
import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Group, NumberInput, Stack, Text } from "@mantine/core";
import { Model } from "@models";
import { IconAlertTriangle } from "@tabler/icons-react";
import { makeSelectOptions, Select } from "@ui";
import { prop } from "@utils";
import { QueryColumn as QueryColumnModule } from "$/models/queries/QueryColumn/QueryColumn";
import { AggregationSelect } from "@/views/DataExplorerApp/AggregationSelect";
import { getManualQueryLimitValue } from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { ManualQueryLargeDatasetLimitHint } from "@/views/DataExplorerApp/QueryForm/ManualQueryLargeDatasetLimitHint/ManualQueryLargeDatasetLimitHint";
import { useOrderDirectionOptions } from "@/views/DataExplorerApp/QueryForm/useOrderDirectionOptions";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import classes from "./ManualQueryForm.module.css";
import type { ManualQueryFormHandlers } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryColumnRead } from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { ReactNode } from "react";

type OverwriteSqlAlertProps = {
  onOverwrite: () => void;
  onDismiss: () => void;
};

/**
 * Confirmation shown when a form edit would replace SQL the form could not
 * fully represent. Spans the whole form because it is a decision about the
 * query as a whole, not about one field group.
 */
export function OverwriteSqlAlert({
  onOverwrite,
  onDismiss,
}: OverwriteSqlAlertProps): ReactNode {
  const { t } = useLingui();
  return (
    <Alert
      icon={<IconAlertTriangle size={16} />}
      color="yellow"
      variant="light"
      title={t`Overwrite SQL?`}
      withCloseButton
      onClose={onDismiss}
      data-testid="overwrite-sql-warning"
    >
      <Text size="xs" mb="xs">
        <Trans>
          The current SQL contains parts that the form could not represent.
          Continuing will overwrite that SQL with one generated from the form.
          This cannot be undone (unless you re-run your previous chat prompt).
        </Trans>
      </Text>
      <Stack gap="xs">
        <Text
          component="button"
          type="button"
          size="xs"
          fw={600}
          c="red"
          onClick={onOverwrite}
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
          onClick={onDismiss}
          data-testid="overwrite-sql-cancel"
          className={classes.unstyledButton}
        >
          <Trans>Keep SQL as-is</Trans>
        </Text>
      </Stack>
    </Alert>
  );
}

type SourceFieldsProps = {
  dataSource: QueryDataSource | undefined;
  queryColumns: PartialStructuredQuery["queryColumns"];
  onDataSourceChange: (dataSource: QueryDataSource | null) => void;
  onSetColumns: (columns: readonly QueryColumnRead[]) => void;
  withinPortal: boolean;
};

/** Data source picker plus the column multi-select it populates. */
export function SourceFields({
  dataSource,
  queryColumns,
  onDataSourceChange,
  onSetColumns,
  withinPortal,
}: SourceFieldsProps): ReactNode {
  const { t } = useLingui();
  return (
    <>
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
        onChange={onSetColumns}
        comboboxProps={{ withinPortal }}
      />
    </>
  );
}

type AggregationFieldsProps = {
  queryColumns: PartialStructuredQuery["queryColumns"];
  aggregations: PartialStructuredQuery["aggregations"];
  onSetColumnAggregation: ManualQueryFormHandlers["onSetColumnAggregation"];
  withinPortal: boolean;
};

/** One aggregation picker per selected column. */
export function AggregationFields({
  queryColumns,
  aggregations,
  onSetColumnAggregation,
  withinPortal,
}: AggregationFieldsProps): ReactNode {
  return queryColumns.map((column) => {
    return (
      <AggregationSelect
        key={column.id}
        label={column.baseColumn.name}
        dataType={column.baseColumn.dataType}
        value={aggregations[column.id] ?? "none"}
        onChange={(newAggregation: QueryAggregationType.T) => {
          onSetColumnAggregation({
            columnId: column.id,
            aggregation: newAggregation,
          });
        }}
        comboboxProps={{ withinPortal }}
      />
    );
  });
}

type SortFieldsProps = {
  queryColumns: PartialStructuredQuery["queryColumns"];
  orderByColumn: PartialStructuredQuery["orderByColumn"];
  orderByDirection: PartialStructuredQuery["orderByDirection"];
  onSetOrderByColumn: ManualQueryFormHandlers["onSetOrderByColumn"];
  onSetOrderByDirection: ManualQueryFormHandlers["onSetOrderByDirection"];
  withinPortal: boolean;
};

/** Sort column and direction pickers, limited to the selected columns. */
export function SortFields({
  queryColumns,
  orderByColumn,
  orderByDirection,
  onSetOrderByColumn,
  onSetOrderByDirection,
  withinPortal,
}: SortFieldsProps): ReactNode {
  const { t } = useLingui();
  const orderDirectionOptions = useOrderDirectionOptions();
  const selectedColumnOptions = makeSelectOptions(queryColumns, {
    valueFn: prop("id"),
    labelFn: (column) => {
      return QueryColumnModule.getDerivedColumnName(column);
    },
  });

  return (
    <>
      <Select
        clearable
        label={t`Column`}
        data={selectedColumnOptions}
        value={orderByColumn}
        placeholder={t`Select column to sort by`}
        disabled={selectedColumnOptions.length === 0}
        onChange={(newColumnId) => {
          onSetOrderByColumn(newColumnId ?? undefined);
        }}
        comboboxProps={{ withinPortal }}
      />
      <Select
        clearable={false}
        label={t`Direction`}
        placeholder={t`Select sort order`}
        data={orderDirectionOptions}
        value={orderByDirection}
        onChange={(newDirection) => {
          onSetOrderByDirection(newDirection ?? undefined);
        }}
        comboboxProps={{ withinPortal }}
      />
    </>
  );
}

type LimitFieldsProps = {
  query: PartialStructuredQuery;
  onSetLimit: ManualQueryFormHandlers["onSetLimit"];
  isLargeDatasetLimitHintVisible: boolean;
  dismissLargeDatasetLimitHint: () => void;
};

/** Row limit input plus the hint shown when a large dataset caps it. */
export function LimitFields({
  query,
  onSetLimit,
  isLargeDatasetLimitHintVisible,
  dismissLargeDatasetLimitHint,
}: LimitFieldsProps): ReactNode {
  const { t } = useLingui();
  const limit = getManualQueryLimitValue(query);
  return (
    <Group align="flex-end" wrap="nowrap" gap="sm">
      <NumberInput
        label={t`Limit`}
        placeholder={t`Maximum rows to return`}
        min={1}
        step={1}
        className={classes.flexFill}
        value={typeof limit === "number" ? limit : ""}
        onChange={(newLimit) => {
          dismissLargeDatasetLimitHint();
          onSetLimit(typeof newLimit === "number" ? newLimit : undefined);
        }}
      />
      <ManualQueryLargeDatasetLimitHint
        visible={isLargeDatasetLimitHintVisible}
      />
    </Group>
  );
}

type FilterFieldsProps = {
  queryColumns: PartialStructuredQuery["queryColumns"];
  filters: QueryFilterGroup;
  onFiltersChange: (nextFilters: QueryFilterGroup) => void;
};

/** Recursive filter builder for the selected columns. */
export function FilterFields({
  queryColumns,
  filters,
  onFiltersChange,
}: FilterFieldsProps): ReactNode {
  return (
    <QueryFiltersField
      columns={queryColumns}
      value={filters}
      onChange={onFiltersChange}
    />
  );
}
