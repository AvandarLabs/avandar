import { noop } from "@avandar/utils";
import { Paper, Stack } from "@mantine/core";
import { SqlEditor } from "@/components/sql/SqlEditor/SqlEditor";
import sqlCss from "@/views/DataExplorerApp/SqlQueryView/SqlQueryView.module.css";
import { EXPLORER_SQL_CATALOG } from "../../Explorer.constants";
import { ExplorerSqlActions } from "./ExplorerSqlActions";
import css from "./ExplorerSqlEditor.module.css";
import { useExplorerSqlFocus } from "./useExplorerSqlFocus";
import type { ReactNode } from "react";

type Props = { sql: string; isEditingSql: boolean };
/**
 * Draws the Data Explorer's SQL panel for the explorer film, so its pointer
 * presses real, tagged controls. While `isEditingSql` it shows a focused
 * editor with its re-run and cancel buttons, and otherwise the read-only
 * query with its edit button. No button does anything. Rendered only by
 * `ExplorerScreen`, which drives both props from the frame.
 */
export function ExplorerSqlEditor({
  sql,
  isEditingSql,
}: Readonly<Props>): ReactNode {
  const sqlViewRef = useExplorerSqlFocus({ sql, isEditingSql });

  return (
    <div className={css.explorerSqlEditorGroup}>
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
        <ExplorerSqlActions sql={sql} isEditingSql={isEditingSql} />
      </Stack>
    </div>
  );
}
