import { useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import type { RefObject } from "react";
/** Keep the native editor focused at the end of each authored SQL draft. */
export function useExplorerSqlFocus({
  sql,
  isEditingSql,
}: Readonly<{
  sql: string;
  isEditingSql: boolean;
}>): RefObject<EditorView | null> {
  const sqlViewRef = useRef<EditorView | null>(null);
  useEffect(
    function focusSqlEditorAtDraftEnd() {
      if (isEditingSql && sqlViewRef.current) {
        const view = sqlViewRef.current;
        view.focus();
        view.dispatch({ selection: { anchor: view.state.doc.length } });
      }
    },
    [sql, isEditingSql],
  );

  return sqlViewRef;
}
