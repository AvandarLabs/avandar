import { noop } from "@avandar/utils";
import { Button, Group, Paper, Stack } from "@mantine/core";
import { useEffect, useRef } from "react";
import { SqlEditor } from "@/components/sql/SqlEditor/SqlEditor";
import sqlCss from "@/views/DataExplorerApp/SqlQueryView/SqlQueryView.module.css";
import { EXPLORER_SQL_CATALOG } from "../Explorer.constants";
import css from "./ExplorerScreen.module.css";
import type { EditorView } from "@codemirror/view";
import type { ReactNode } from "react";

type Props = { sql: string; isEditingSql: boolean };
/** SQL editor fixture driven by the current video frame. */
export function ExplorerSqlEditor({
  sql,
  isEditingSql,
}: Readonly<Props>): ReactNode {
  const sqlViewRef = useRef<EditorView | null>(null);
  useEffect(() => {
    if (isEditingSql && sqlViewRef.current) {
      const view = sqlViewRef.current;
      view.focus();
      view.dispatch({ selection: { anchor: view.state.doc.length } });
    }
  }, [sql, isEditingSql]);

  return (
    <div className={css.explorerSqlGroup}>
      <Stack gap={isEditingSql ? "sm" : "xs"}>
        {isEditingSql ? (
          <div data-video-target="explorer-sql-editor">
            <SqlEditor
              value={sql}
              catalog={EXPLORER_SQL_CATALOG}
              onChange={noop}
              minRows={9}
              onEditorReady={(view) => {
                sqlViewRef.current = view;
              }}
            />
          </div>
        ) : (
          <Paper p="sm" className={sqlCss.sqlPaper}>
            <SqlEditor
              value={sql}
              catalog={EXPLORER_SQL_CATALOG}
              onChange={noop}
              readOnly
              minRows={9}
            />
          </Paper>
        )}
        <Group
          justify="flex-end"
          gap="xs"
          className={isEditingSql ? undefined : sqlCss.editQueryRow}
        >
          {isEditingSql ? (
            <>
              <Button
                data-video-target="explorer-run-query"
                size="sm"
                variant="default"
                disabled={sql.trim().length === 0}
                onClick={noop}
              >
                Re-run query
              </Button>
              <Button size="sm" variant="subtle" onClick={noop}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              data-video-target="explorer-edit-query"
              size="xs"
              variant="subtle"
              onClick={noop}
            >
              Edit query
            </Button>
          )}
        </Group>
      </Stack>
    </div>
  );
}
