import clsx from "clsx";
import { RowIssueContext } from "../RowIssueContext/RowIssueContext";
import { TokenControl } from "../TokenControl";
import { useTokenEditor } from "../TokenEditorContext";
import {
  findTokenRowIssue,
  type TokenRow as TokenRowModel,
} from "../tokenRows/tokenRows";
import { ItemOverrideNote } from "./ItemOverrideNote/ItemOverrideNote";
import css from "./TokenRow.module.css";
import { TokenRowHeader } from "./TokenRowHeader/TokenRowHeader";
import { TokenRowIssue } from "./TokenRowIssue/TokenRowIssue";
import { useTokenRowLabel } from "./useTokenRowLabel";
import type { ReactNode } from "react";

/**
 * One token: its name and state, its control, its path and description, and
 * any problem. An inherited item-scope value shows muted text and an
 * "Same as the theme" tag, and its chips and previews dim. A problem puts the
 * control's inputs in Mantine's error state and adds an alert line.
 */
export function TokenRow({ row }: Readonly<{ row: TokenRowModel }>): ReactNode {
  const editor = useTokenEditor();
  const label = useTokenRowLabel()(row);
  const issue = findTokenRowIssue({
    issues: editor.issues,
    tokenPath: row.path,
  });
  const isInherited =
    editor.scope.kind === "item" && row.overrideState === "none";
  return (
    <div
      className={clsx(css.tokenRow, isInherited && css.tokenRowInherited)}
      data-token-path={row.path}
    >
      <TokenRowHeader
        row={row}
        label={label}
        isInherited={isInherited}
        hasIssue={issue !== undefined}
      />
      {row.itemOverride ? <ItemOverrideNote label={label} /> : null}
      <RowIssueContext.Provider value={issue !== undefined}>
        <TokenControl row={row} label={label} />
      </RowIssueContext.Provider>
      <p className={css.tokenRowMeta}>
        <code className={css.tokenRowPath}>{row.path}</code>{" "}
        {row.definition.description}
      </p>
      {issue ? (
        <TokenRowIssue issue={issue} kind={row.definition.kind} />
      ) : null}
    </div>
  );
}
