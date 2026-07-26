import { EditorView } from "@codemirror/view";
import { computeSqlScope } from "@/components/sql/sql-helpers/sqlScope/sqlScope";
import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import { SqlEditor } from "@/components/sql/SqlEditor/SqlEditor";
import css from "./AvaSqlBlock.module.css";
import { PillEditPopover } from "./PillEditPopover/PillEditPopover";
import type { SqlPillClickInfo } from "@/components/sql/sql-helpers/createSqlDisplayExtension";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";
import type { ReactNode } from "react";

type EditableProps = {
  value: string;
  catalog: SqlDisplayCatalog;
  onChange: (next: string) => void;
  minRows: number;
  className: string | undefined;
  dataTestId: string | undefined;
};

export function AvaSqlBlockEditable({
  value,
  catalog,
  onChange,
  minRows,
  className,
  dataTestId,
}: EditableProps): ReactNode {
  const editorViewRef = useRef<EditorView | null>(null);
  const [activePill, setActivePill] = useState<SqlPillClickInfo | null>(null);

  const scope = useMemo(() => {
    return computeSqlScope({ sql: value, catalog });
  }, [value, catalog]);

  const onPillClick = (info: SqlPillClickInfo): void => {
    setActivePill(info);
  };

  const onClose = (): void => {
    setActivePill(null);
  };

  const onSelect = (replacement: { insert: string }): void => {
    if (editorViewRef.current === null || activePill === null) {
      return;
    }
    editorViewRef.current.dispatch({
      changes: {
        from: activePill.start,
        to: activePill.end,
        insert: replacement.insert,
      },
    });
    setActivePill(null);
  };

  return (
    <div className={clsx(css.editableWrap, className)} data-testid={dataTestId}>
      <SqlEditor
        value={value}
        onChange={onChange}
        catalog={catalog}
        minRows={minRows}
        onPillClick={onPillClick}
        onEditorReady={(view) => {
          editorViewRef.current = view;
        }}
      />
      {scope.outOfScopeColumnTokens.length > 0 ?
        <div className={css.errorNotice} data-testid="ava-sql-out-of-scope">
          {scope.outOfScopeColumnTokens.length === 1 ?
            `1 column is not in the current dataset scope.`
          : `${scope.outOfScopeColumnTokens.length} columns are not in the current dataset scope.`
          }
        </div>
      : null}
      <PillEditPopover
        pill={activePill}
        catalog={catalog}
        sql={value}
        onClose={onClose}
        onSelect={onSelect}
      />
    </div>
  );
}
