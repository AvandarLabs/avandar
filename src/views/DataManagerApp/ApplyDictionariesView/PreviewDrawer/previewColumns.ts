import { toValueKey } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import {
  buildDraftConversion,
  isConvertingPick,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type {
  ApplyDictionariesState,
  ColumnPick,
  ValueResolution,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { UnmatchedValue } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type {
  PreviewCell,
  PreviewColumn,
} from "@/views/DataManagerApp/ApplyDictionariesView/usePreviewRows";

/** One preview column, how the apply treats it, and what to tint. */
export type PreviewColumnPlan = PreviewColumn & {
  /** Has a pick: "Only columns this touches" keeps it. */
  isTouched: boolean;
  /** Attached as reference: unchanged, with a tag in its header. */
  isReference: boolean;
  /** Keys of the values still unmatched once resolved, to tint. */
  unmatchedKeys: ReadonlySet<string>;
};

/** How a preview cell is drawn. */
export type PreviewCellStatus = "changed" | "unmatched" | "plain";

/** Whether a resolution still leaves its value as it is. */
function _isStillUnmatched(resolution: ValueResolution | undefined): boolean {
  if (!resolution || resolution.action === "keep") {
    return true;
  }
  return (
    (resolution.action === "add" && resolution.text.trim() === "") ||
    (resolution.action === "map" && resolution.code === "")
  );
}

function _toPlan(
  column: DatasetColumn.T,
  pick: ColumnPick | undefined,
  options: Readonly<Omit<Parameters<typeof buildPreviewColumns>[0], "columns">>,
): PreviewColumnPlan {
  const codeList = pick?.codeListId
    ? options.codeLists.get(pick.codeListId)
    : undefined;
  const resolutions = options.resolutions[column.id];
  const unmatched = options.unmatchedByColumnId.get(column.id);
  const conversion =
    isConvertingPick(pick) && codeList
      ? buildDraftConversion({ column, pick, codeList, resolutions, unmatched })
      : undefined;
  const unmatchedKeys = new Set(
    (unmatched ?? [])
      .filter((item) => {
        return _isStillUnmatched(resolutions?.[item.valueKey]);
      })
      .map((item) => {
        return item.valueKey;
      }),
  );
  return {
    column,
    conversion,
    isTouched: pick !== undefined,
    isReference: codeList !== undefined && conversion === undefined,
    unmatchedKeys,
  };
}

/**
 * Every column of the preview, in the dataset's order, with the
 * conversion it would get if saved now and the values it would leave
 * unmatched.
 */
export function buildPreviewColumns(
  options: Readonly<{
    columns: readonly DatasetColumn.T[];
    picks: ApplyDictionariesState["picks"];
    codeLists: ReadonlyMap<string, DataDictionaryCodeList.T>;
    resolutions: ApplyDictionariesState["resolutions"];
    unmatchedByColumnId: ReadonlyMap<string, readonly UnmatchedValue[]>;
  }>,
): PreviewColumnPlan[] {
  return options.columns.map((column) => {
    return _toPlan(column, options.picks[column.id], options);
  });
}

/**
 * Changed when the conversion gives the cell a different value; otherwise
 * unmatched when its value is one no pair matches, else plain.
 */
export function getPreviewCellStatus(
  cell: PreviewCell,
  unmatchedKeys: ReadonlySet<string>,
): PreviewCellStatus {
  if (cell.converted !== undefined && cell.converted !== cell.raw) {
    return "changed";
  }
  return unmatchedKeys.has(toValueKey(cell.raw)) ? "unmatched" : "plain";
}
