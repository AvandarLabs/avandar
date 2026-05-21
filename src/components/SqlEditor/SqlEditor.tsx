import { sql } from "@codemirror/lang-sql";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSqlDisplayExtension } from "@/lib/sql/createSqlDisplayExtension.ts";
import { createSqlMentionExtension } from "@/lib/sql/createSqlMentionExtension.ts";
import css from "./SqlEditor.module.css";
import type { SqlDisplayCatalog } from "$/lib/sql/sqlDisplay.types.ts";

/** Matches `line-height: 1.55` on `.cm-line` at `font-size-sm` (~14px). */
const LINE_HEIGHT_PX = 22;

export type SqlEditorProps = {
  value: string;
  onChange: (value: string) => void;
  catalog: SqlDisplayCatalog;
  readOnly?: boolean;
  /** Approximate minimum visible rows (maps to editor min-height). */
  minRows?: number;
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
  "data-testid": dataTestId,
}: SqlEditorProps): JSX.Element {
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;

  const [editorView, setEditorView] = useState<EditorView | null>(null);

  const catalogCompartment = useMemo(() => {
    return new Compartment();
  }, []);

  const buildCatalogExtensions = useMemo(() => {
    return (): Array<ReturnType<typeof createSqlDisplayExtension>> => {
      const getCatalog = (): SqlDisplayCatalog => {
        return catalogRef.current;
      };
      return [
        createSqlDisplayExtension(getCatalog),
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
