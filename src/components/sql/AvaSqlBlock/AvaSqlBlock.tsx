
import { buildSqlDisplaySegments } from "@/components/sql/sql-helpers/buildSqlDisplaySegments/buildSqlDisplaySegments";
import clsx from "clsx";
import { SqlEditor } from "@/components/sql/SqlEditor/SqlEditor";
import { useSqlDisplayCatalog } from "@/components/sql/sql-helpers/useSqlDisplayCatalog";
import css from "./AvaSqlBlock.module.css";
import { AvaSqlBlockEditable } from "./AvaSqlBlockEditable";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";
import type { ReactNode } from "react";

export type AvaSqlBlockProps = {
  value: string;
  /**
   * Workspace catalog of datasets and columns used to recognize pill tokens.
   * When omitted, the catalog is read from `useSqlDisplayCatalog()`.
   */
  catalog?: SqlDisplayCatalog;
  readOnly?: boolean;
  /**
   * Called when the document text changes (whether typed by the user or
   * dispatched via a pill swap). Required to make the block editable;
   * ignored when `readOnly` is true.
   */
  onChange?: (next: string) => void;
  /** Approximate minimum visible rows for the editable variant. */
  minRows?: number;
  /**
   * Out-of-scope column names. When non-empty, those names are rendered with
   * an error-styled pill (`.sqlPill--error`) and an inline notice is shown.
   * Only honored in the read-only HTML variant; the editable CodeMirror
   * path computes scope live (see {@link computeSqlScope}).
   */
  outOfScopeColumns?: readonly string[];
  className?: string;
  "data-testid"?: string;
};

type ResolvedProps = AvaSqlBlockProps & { catalog: SqlDisplayCatalog };

/**
 * Render a SQL string with workspace dataset and column tokens replaced by
 * pills. Two render paths:
 *
 *   1. `readOnly` (default when no `onChange`): lightweight HTML using
 *      `buildSqlDisplaySegments`. Cheap for many instances in chat markdown.
 *   2. editable (`onChange` provided and `readOnly` is not `true`):
 *      delegates to {@link SqlEditor} which uses CodeMirror with the pill
 *      decoration extension. Pills are interactive in this path: a caret
 *      opens a Combobox to swap the underlying token, and out-of-scope
 *      column pills render in an error state.
 *
 * Data flow is strictly top-down: every change (typing, pill swap) flows
 * out through `onChange`. The caller is the source of truth for the SQL
 * string.
 */
export function AvaSqlBlock(props: AvaSqlBlockProps): ReactNode {
  if (props.catalog !== undefined) {
    return <_AvaSqlBlockInner {...props} catalog={props.catalog} />;
  }
  return <AvaSqlBlockWithHookCatalog {...props} />;
}

function AvaSqlBlockWithHookCatalog(props: AvaSqlBlockProps): ReactNode {
  const { catalog } = useSqlDisplayCatalog();
  return <_AvaSqlBlockInner {...props} catalog={catalog} />;
}

function _AvaSqlBlockInner({
  value,
  catalog,
  readOnly,
  onChange,
  minRows = 4,
  outOfScopeColumns,
  className,
  "data-testid": dataTestId,
}: ResolvedProps): ReactNode {
  const isEditable = readOnly !== true && onChange !== undefined;

  if (isEditable) {
    return (
      <AvaSqlBlockEditable
        value={value}
        catalog={catalog}
        onChange={onChange}
        minRows={minRows}
        className={className}
        dataTestId={dataTestId}
      />
    );
  }

  const segments = buildSqlDisplaySegments({ sql: value, catalog });
  const outOfScopeSet = new Set(outOfScopeColumns ?? []);

  return (
    <pre className={clsx(css.root, className)} data-testid={dataTestId}>
      <code className={css.code}>
        {segments.map((segment, idx) => {
          if (segment.kind === "text") {
            return <span key={`text-${idx}`}>{segment.value}</span>;
          }
          if (segment.kind === "dataset") {
            return (
              <span
                key={`ds-${idx}`}
                className="sqlPill sqlPill--dataset"
                data-sql-pill="dataset"
              >
                {segment.label}
              </span>
            );
          }
          const isError = outOfScopeSet.has(segment.name);
          return (
            <span
              key={`col-${idx}`}
              className={clsx(
                "sqlPill",
                "sqlPill--column",
                isError && "sqlPill--error",
              )}
              data-sql-pill={isError ? "column-error" : "column"}
            >
              {segment.label}
            </span>
          );
        })}
      </code>
      {outOfScopeSet.size > 0 ?
        <div className={css.errorNotice} data-testid="ava-sql-out-of-scope">
          {outOfScopeSet.size === 1 ?
            `1 column is not in the current dataset scope.`
          : `${outOfScopeSet.size} columns are not in the current dataset scope.`
          }
        </div>
      : null}
    </pre>
  );
}
