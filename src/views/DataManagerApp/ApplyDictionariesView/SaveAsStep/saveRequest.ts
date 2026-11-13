import {
  buildAddedPairs,
  buildBindingInputs,
  isConvertingPick,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { AddedCodeConflict } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type {
  ApplyDictionariesState,
  ColumnPick,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";
import type { ApplySaveRequest } from "@/views/DataManagerApp/ApplyDictionariesView/useSaveApply";
import type { UnmatchedValues } from "@/views/DataManagerApp/ApplyDictionariesView/useUnmatchedValues";

/** Why the primary button is disabled. */
export type SaveBlocker =
  | "no_target"
  | "reading_values"
  | "added_code_conflict"
  | "no_name"
  | "needs_confirmation";

/** What saving does to one column, for the summary table. */
export type WhatHappens =
  | { kind: "decode" | "encode"; restoresSource: boolean }
  | { kind: "reference" | "restored" | "described" }
  | { kind: "removed"; restoresValues: boolean };

/**
 * The save the step's state stands for, or undefined while there is no
 * target. A linked dataset updates its own live conversions; otherwise the
 * chosen target decides, and changing in place pins the conversions.
 */
export function buildSaveRequest(
  options: Readonly<{
    state: ApplyDictionariesState;
    columns: readonly DatasetColumn.T[];
    unmatched: UnmatchedValues;
    codeLists: ReadonlyMap<string, DataDictionaryCodeList.T>;
    isLinkedDataset: boolean;
    linkedDatasetName: string;
  }>,
): ApplySaveRequest | undefined {
  const { state } = options;
  const target = options.isLinkedDataset ? "update_linked" : state.saveTarget;
  if (!target) {
    return undefined;
  }
  const unmatchedByColumnId =
    options.unmatched.status === "ready" ? options.unmatched.result : new Map();
  const shared = {
    picks: state.picks,
    resolutions: state.resolutions,
    unmatchedByColumnId,
  };
  const bindings = buildBindingInputs({
    ...shared,
    columns: options.columns,
    codeLists: options.codeLists,
    isPinned: target === "in_place",
  });
  const addedPairs = buildAddedPairs(shared);
  return target === "linked"
    ? {
        kind: "linked",
        linkedDatasetName: options.linkedDatasetName,
        bindings,
        addedPairs,
      }
    : { kind: target, bindings, addedPairs };
}

/**
 * Why the request cannot be saved yet: no target chosen, the unmatched
 * values still being read (until then overrides only know each value's
 * lowercased key, not its stored text), two values adding one code to a
 * list, a linked dataset with no name, or a synced upload changed in place
 * without the confirmation ticked.
 */
export function getSaveBlocker(
  options: Readonly<{
    request: ApplySaveRequest | undefined;
    targets: ApplyTargets | undefined;
    hasConfirmedWorkspaceChange: boolean;
    unmatched: UnmatchedValues;
    addedCodeConflicts: readonly AddedCodeConflict[];
  }>,
): SaveBlocker | undefined {
  const { request } = options;
  if (!request) {
    return "no_target";
  }
  if (options.unmatched.status === "reading") {
    return "reading_values";
  }
  if (options.addedCodeConflicts.length > 0) {
    return "added_code_conflict";
  }
  if (request.kind === "linked" && request.linkedDatasetName.trim() === "") {
    return "no_name";
  }
  const isSynced = options.targets?.inPlace.storage === "synced";
  return request.kind === "in_place" &&
    isSynced &&
    !options.hasConfirmedWorkspaceChange
    ? "needs_confirmation"
    : undefined;
}

/**
 * What saving does to one column: it converts (and, for a source that was
 * converted in place, goes back to its values there), stays as reference,
 * goes back to its values, gets a description, or loses its dictionary.
 */
export function getWhatHappens(
  options: Readonly<{
    pick: ColumnPick | undefined;
    existing: DictionaryBinding.T | undefined;
  }>,
): WhatHappens {
  const { pick, existing } = options;
  const wasConverted = existing?.mode === "convert";
  if (!pick) {
    return { kind: "removed", restoresValues: wasConverted };
  }
  if (isConvertingPick(pick)) {
    return { kind: pick.direction, restoresSource: wasConverted };
  }
  if (!pick.codeListId) {
    return { kind: "described" };
  }
  return { kind: wasConverted ? "restored" : "reference" };
}
