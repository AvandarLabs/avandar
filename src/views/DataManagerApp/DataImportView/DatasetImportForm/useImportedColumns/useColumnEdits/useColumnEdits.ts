import { useCallback, useState } from "react";
import type {
  ImportedColumnEdit,
  ImportedColumnEditsByColumnIdx,
} from "../applyImportedColumnEdits/applyImportedColumnEdits";

/** Shared empty edit set, so an unedited import keeps a stable identity. */
const NO_EDITS: ImportedColumnEditsByColumnIdx = {};

/** The user's pending column edits, plus the means to add one. */
export type ColumnEditsState = {
  /** The edits that belong to the current parse. */
  activeEdits: ImportedColumnEditsByColumnIdx;

  /** Records an edit against the column with this `columnIdx`. */
  updateColumn: (columnIdx: number, edit: Readonly<ImportedColumnEdit>) => void;
};

/**
 * Holds column edits against the parse that produced the columns.
 *
 * Keyed by `loadResultId` rather than cleared on change, so a re-parse with a
 * different delimiter or sheet discards the edits instead of silently
 * reapplying choices the user made about a different set of columns.
 * Discarding on read (not in an effect) means the stale edits never reach a
 * render.
 */
export function useColumnEdits(loadResultId: string): ColumnEditsState {
  const [edits, setEdits] = useState<{
    loadResultId: string;
    byColumnIdx: ImportedColumnEditsByColumnIdx;
  }>(() => {
    return { loadResultId, byColumnIdx: NO_EDITS };
  });

  const updateColumn = useCallback(
    (columnIdx: number, edit: Readonly<ImportedColumnEdit>) => {
      setEdits((prevEdits) => {
        const baseEdits =
          prevEdits.loadResultId === loadResultId ?
            prevEdits.byColumnIdx
          : NO_EDITS;
        return {
          loadResultId,
          byColumnIdx: {
            ...baseEdits,
            [columnIdx]: { ...baseEdits[columnIdx], ...edit },
          },
        };
      });
    },
    [loadResultId],
  );

  return {
    activeEdits:
      edits.loadResultId === loadResultId ? edits.byColumnIdx : NO_EDITS,
    updateColumn,
  };
}
