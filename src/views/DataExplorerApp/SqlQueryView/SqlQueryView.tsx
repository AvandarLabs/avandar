import { isDefined, matchLiteral } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { formatSqlForDisplay } from "@/components/sql/sql-helpers/formatSqlForDisplay/formatSqlForDisplay";
import { SqlQueryEditPanel } from "@/components/sql/SqlEditor/SqlQueryEditPanel";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import { SqlReadOnlyBlock } from "@/views/DataExplorerApp/SqlQueryView/SqlReadOnlyBlock";
import { SqlSyncWarningNotes } from "@/views/DataExplorerApp/SqlQueryView/SqlSyncWarningNotes";
import css from "./SqlQueryView.module.css";
import type {
  SettingsColumnGroup,
  SettingsColumnsLayout,
} from "@/components/SettingsColumns/SettingsColumns";
import type { ReactNode } from "react";

const SQL_EDITOR_MIN_ROWS = 10;

/** Narrowest the SQL editor column may get before the notes column wraps. */
const SQL_COLUMN_MIN_WIDTH = 320;

type Props = {
  /**
   * How the editor and its sync notes are arranged. `stacked` puts the notes
   * above the editor; `columns` puts them side by side, which is what the
   * bounded-height Data Explorer drawer wants.
   */
  layout?: SettingsColumnsLayout;
};

/**
 * Read-only view of the current SQL with an "Edit query" affordance that
 * swaps the textarea into edit mode and re-runs the query on submit. Reads
 * `rawSql` from `DataExplorerStateManager` so it stays in sync regardless of
 * whether the SQL came from the chat panel, the manual query form, or a
 * saved dataset.
 */
export function SqlQueryView({ layout = "stacked" }: Props): ReactNode {
  const { t } = useLingui();
  const [{ rawSql, isStructuredQueryInSync, sqlSyncWarnings }, dispatch] =
    DataExplorerStateManager.useContext();
  const [isEditMode, setIsEditMode] = useState(false);
  const { parseSql } = useSqlToStructuredQuery();
  const displaySql = useMemo(() => {
    return formatSqlForDisplay(rawSql ?? "");
  }, [rawSql]);

  const onSubmitSql = (rawValue: string): void => {
    const trimmedValue = rawValue.trim();
    dispatch.setRawSql(trimmedValue);
    const mapping = parseSql(trimmedValue);
    dispatch.applySqlMapping({
      query: mapping.query,
      isFullyMapped: mapping.isFullyMapped,
      unmappedReasons: mapping.unmappedReasons,
    });
    setIsEditMode(false);
  };

  if (rawSql === undefined) {
    return (
      <Stack gap="xs" px="sm" py="sm">
        <Text size="sm" c="neutral.6">
          <Trans>
            No SQL yet. Ask Avandar a question or build a query in the Manual
            tab to generate SQL.
          </Trans>
        </Text>
      </Stack>
    );
  }

  const hasSyncWarnings =
    !isStructuredQueryInSync && sqlSyncWarnings.length > 0;

  const syncWarningNotes = (
    <SqlSyncWarningNotes syncWarnings={sqlSyncWarnings} />
  );

  const editor =
    isEditMode ?
      <SqlQueryEditPanel
        initialSql={rawSql}
        submitButtonLabel={t`Re-run query`}
        cancelButtonLabel={t`Cancel`}
        minRows={SQL_EDITOR_MIN_ROWS}
        onSubmit={onSubmitSql}
        onCancel={() => {
          setIsEditMode(false);
        }}
      />
    : <SqlReadOnlyBlock
        displaySql={displaySql}
        minRows={SQL_EDITOR_MIN_ROWS}
        onEdit={() => {
          setIsEditMode(true);
        }}
      />;

  const groups: SettingsColumnGroup[] = [
    { id: "sql", title: "SQL", content: editor },
    hasSyncWarnings ?
      {
        id: "sync-notes",
        title: t`Manual form shows an approximation`,
        content: syncWarningNotes,
      }
    : undefined,
  ].filter(isDefined);

  return matchLiteral(layout, {
    columns: () => {
      return (
        <SettingsColumns
          groups={groups}
          layout="columns"
          minColumnWidth={SQL_COLUMN_MIN_WIDTH}
        />
      );
    },
    stacked: () => {
      return (
        <Stack gap="xs" px="sm" className={css.root}>
          {hasSyncWarnings ?
            <Alert
              icon={<IconAlertTriangle size={16} />}
              color="yellow"
              variant="light"
              title={t`Manual form shows an approximation`}
            >
              {syncWarningNotes}
            </Alert>
          : null}
          {editor}
        </Stack>
      );
    },
  });
}
