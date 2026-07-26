import { sql } from "@codemirror/lang-sql";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSqlDisplayExtension } from "@/components/sql/sql-helpers/createSqlDisplayExtension";
import { createSqlMentionExtension } from "@/components/sql/sql-helpers/createSqlMentionExtension";
import css from "./SqlEditor.module.css";
import type { SqlPillClickInfo } from "@/components/sql/sql-helpers/createSqlDisplayExtension";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";
import type { ReactNode } from "react";

/** Matches `line-height: 1.55` on `.cm-line` at `font-size-sm` (~14px). */
const LINE_HEIGHT_PX = 22;

export type SqlEditorProps = {
  value: string;
  onChange: (value: string) => void;
  catalog: SqlDisplayCatalog;
  readOnly?: boolean;
  /** Approximate minimum visible rows (maps to editor min-height). */
  minRows?: number;
  /**
   * Fires when the user clicks a pill in editable mode. The caller is
   * expected to show an edit popover and dispatch a replacement transaction
   * via the view ref received in {@link onEditorReady}.
   */
  onPillClick?: (info: SqlPillClickInfo) => void;
  /**
   * Called once the underlying {@link EditorView} is constructed. Use the
   * view to dispatch transactions (for example, when committing a pill
   * replacement from a popover).
   */
  onEditorReady?: (view: EditorView) => void;
  "data-testid"?: string;
};

/**
 * SQL editor with dataset/column pills and `@` autocomplete for mentions.
 * The document always stores canonical SQL (dataset ids, quoted columns).
 */
export function SqlEditor({
  value,
  onChange,
  catalog,
  readOnly = false,
  minRows = 6,
  onPillClick,
  onEditorReady,
  "data-testid": dataTestId,
}: SqlEditorProps): ReactNode {
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const onPillClickRef = useRef(onPillClick);
  onPillClickRef.current = onPillClick;

  const [editorView, setEditorView] = useState<EditorView | undefined>(
    undefined,
  );

  const catalogCompartment = useMemo(() => {
    return new Compartment();
  }, []);

  const buildCatalogExtensions = useMemo(() => {
    return (): Extension[] => {
      const getCatalog = (): SqlDisplayCatalog => {
        return catalogRef.current;
      };
      const pillsEditable = !readOnly;
      return [
        createSqlDisplayExtension(getCatalog, {
          editable: pillsEditable,
          onPillClick: (info) => {
            onPillClickRef.current?.(info);
          },
        }),
        ...(readOnly ? [] : [createSqlMentionExtension(getCatalog)]),
      ];
    };
  }, [readOnly]);

  const extensions = useMemo(() => {
    return [
      sql(),
      catalogCompartment.of(buildCatalogExtensions()),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
    ];
  }, [buildCatalogExtensions, catalogCompartment, readOnly]);

  useEffect(() => {
    if (!editorView) {
      return;
    }
    editorView.dispatch({
      effects: catalogCompartment.reconfigure(buildCatalogExtensions()),
    });
  }, [buildCatalogExtensions, catalog, catalogCompartment, editorView]);

  const minHeightPx = minRows * LINE_HEIGHT_PX + 16;

  return (
    <div
      className={clsx(css.root, readOnly && css.rootReadOnly)}
      style={{ minHeight: minHeightPx }}
      data-testid={dataTestId}
    >
      <CodeMirror
        value={value}
        extensions={extensions}
        onChange={onChange}
        onCreateEditor={(view) => {
          setEditorView(view);
          onEditorReady?.(view);
        }}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: false,
        }}
      />
    </div>
  );
}
