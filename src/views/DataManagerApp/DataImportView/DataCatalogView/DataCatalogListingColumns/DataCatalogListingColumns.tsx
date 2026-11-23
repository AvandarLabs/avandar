import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Loader, Stack, Text } from "@mantine/core";
import { avaDataTypeLabel } from "$/copy/avaDataTypeLabel";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingColumns/DataCatalogListingColumns.module.css";
import type { DataCatalogRelationColumn } from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumn";
import type { ReactNode } from "react";

/**
 * Whether a listing's column types are known. `checking` while they are
 * unverified or stale and being, or about to be, read from the source;
 * `failed` when the last check on this page failed; `verified` otherwise.
 */
export type ColumnTypeState = "checking" | "failed" | "verified";

type Props = {
  columns: readonly DataCatalogRelationColumn.T[];
  columnTypeState: ColumnTypeState;
};

function _sortByDisplayOrder(
  columns: readonly DataCatalogRelationColumn.T[],
): DataCatalogRelationColumn.T[] {
  return [...columns].sort((columnA, columnB) => {
    return (
      (columnA.displayOrder ?? Number.MAX_SAFE_INTEGER) -
      (columnB.displayOrder ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

function _ColumnTypeNote({
  columnTypeState,
  columnCount,
}: {
  columnTypeState: ColumnTypeState;
  columnCount: number;
}): ReactNode {
  if (columnTypeState === "checking") {
    return (
      <Text size="sm" c="dimmed" maw="60ch">
        {columnCount === 0 ? (
          <Trans>Reading a sample of this dataset to find its columns.</Trans>
        ) : (
          <Trans>
            Reading a sample of this dataset to confirm its columns and their
            types. The list below may change.
          </Trans>
        )}
      </Text>
    );
  }
  if (columnTypeState === "failed") {
    return (
      <Text size="sm" c="danger.8" maw="60ch">
        <Trans>
          We couldn't read a sample of this dataset, so its columns and their
          types are not confirmed. Adding it will try again.
        </Trans>
      </Text>
    );
  }
  return null;
}

/**
 * A catalog listing's columns and their types, and whether those are
 * confirmed yet. A pipeline often knows only a listing's column names, so
 * until a sample of the source is read every column shows as text, or the
 * list is empty: the note says so rather than presenting that as fact.
 */
export function DataCatalogListingColumns({
  columns,
  columnTypeState,
}: Props): ReactNode {
  const { t } = useLingui();
  const meta =
    columnTypeState === "checking" ? (
      <Group component="span" gap={6} wrap="nowrap">
        <Loader size={12} color="neutral" />
        <Trans>Checking column types</Trans>
      </Group>
    ) : (
      t`${columns.length}`
    );

  return (
    <AppViewSection title={<Trans>Columns</Trans>} meta={meta}>
      <Stack gap="xs">
        <_ColumnTypeNote
          columnTypeState={columnTypeState}
          columnCount={columns.length}
        />
        {columns.length > 0 ? (
          <dl className={css.dataCatalogListingColumns}>
            {_sortByDisplayOrder(columns).map((column) => {
              return (
                <div
                  key={column.id}
                  className={css.dataCatalogListingColumnsRow}
                >
                  <dt className={css.dataCatalogListingColumnsName}>
                    {column.columnName}
                  </dt>
                  <dd className={css.dataCatalogListingColumnsType}>
                    {avaDataTypeLabel(
                      DuckDbDataTypeUtils.toAvaDataType(column.castDataType),
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}
      </Stack>
    </AppViewSection>
  );
}
