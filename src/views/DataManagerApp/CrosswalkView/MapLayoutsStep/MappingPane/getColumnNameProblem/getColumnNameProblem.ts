import { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

/** Why a name cannot name a column of the combined dataset. */
export type ColumnNameProblem = "blank" | "taken" | "source_column";

function _toNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Whether a name can name a column of the combined dataset: not blank, not
 * another column's name ignoring case and surrounding spaces, and not the
 * source column's name while the crosswalk adds it. These are the rules
 * `rpc_crosswalks__save` enforces, checked before a save is sent.
 */
export function getColumnNameProblem(
  options: Readonly<{
    name: string;
    draft: Pick<CrosswalkDraft.T, "columns" | "addsSourceColumn">;
    /** The column being renamed, which may keep its own name. */
    exceptColumnId?: CrosswalkColumn.Id;
  }>,
): ColumnNameProblem | undefined {
  const key = _toNameKey(options.name);
  if (key === "") {
    return "blank";
  }
  if (options.draft.addsSourceColumn && key === Crosswalk.SOURCE_COLUMN_NAME) {
    return "source_column";
  }
  const isTaken = options.draft.columns.some((column) => {
    return (
      column.id !== options.exceptColumnId && _toNameKey(column.name) === key
    );
  });
  return isTaken ? "taken" : undefined;
}
