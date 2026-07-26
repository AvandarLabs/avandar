import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Button, Group, List, Paper, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { AvaSqlBlock } from "@/components/sql/AvaSqlBlock";
import { SqlQueryEditPanel } from "@/components/sql/SqlEditor";
import { formatSqlForDisplay } from "@/components/sql/sql-helpers/formatSqlForDisplay";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import css from "./SqlQueryView.module.css";
import type { ReactNode } from "react";

const SQL_EDITOR_MIN_ROWS = 10;

/**
 * Read-only view of the current SQL with an "Edit query" affordance that
 * swaps the textarea into edit mode and re-runs the query on submit. Reads
 * `rawSQL` from `DataExplorerStateManager` so it stays in sync regardless of
 * whether the SQL came from the chat panel, the manual query form, or a
 * saved dataset.
 */
export function SqlQueryView(): ReactNode {
  const { t } = useLingui();
  const [{ rawSQL, isStructuredQueryInSync, sqlSyncWarnings }, dispatch] =
    DataExplorerStateManager.useContext();
  const [isEditMode, setIsEditMode] = useState(false);
  const { parseSql } = useSqlToStructuredQuery();
  const displaySql = useMemo(() => {
    return formatSqlForDisplay(rawSQL ?? "");
  }, [rawSQL]);

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

  if (rawSQL === undefined) {
    return (
      <Stack gap="xs" px="sm">
        <Text size="sm" c="neutral.6">
          <Trans>
            No SQL yet. Ask Avandar a question or build a query in the Manual
            tab to generate SQL.
          </Trans>
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xs" px="sm" className={css.root}>
      {!isStructuredQueryInSync && sqlSyncWarnings.length > 0 ?
        <Alert
          icon={<IconAlertTriangle size={16} />}
          color="yellow"
          variant="light"
          title={t`Manual form shows an approximation`}
          data-testid="sql-sync-warning"
        >
          <Text size="xs" mb="xs">
            <Trans>
              Parts of this SQL could not be represented in the Manual form. The
              form shows a best-effort approximation; the SQL above is what
              actually runs.
            </Trans>
          </Text>
          <List size="xs" spacing={2}>
            {sqlSyncWarnings.map((reason) => {
              return <List.Item key={reason}>{reason}</List.Item>;
            })}
          </List>
        </Alert>
      : null}
      {isEditMode ?
        <SqlQueryEditPanel
          initialSql={rawSQL}
          submitButtonLabel={t`Re-run query`}
          cancelButtonLabel={t`Cancel`}
          minRows={SQL_EDITOR_MIN_ROWS}
          onSubmit={onSubmitSql}
          onCancel={() => {
            setIsEditMode(false);
          }}
        />
      : <Stack gap="xs">
          <Paper p="sm" className={css.sqlPaper}>
            <AvaSqlBlock
              value={displaySql}
              readOnly
              minRows={SQL_EDITOR_MIN_ROWS}
              data-testid="sql-query-view-editor"
            />
          </Paper>
          <Group justify="flex-end" className={css.editQueryRow}>
            <Button
              size="xs"
              variant="subtle"
              onClick={() => {
                setIsEditMode(true);
              }}
            >
              <Trans>Edit query</Trans>
            </Button>
          </Group>
        </Stack>
      }
    </Stack>
  );
}
