import { vi } from "vitest";
import { makeInitialApplyState } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";

/** A dictionary the apply tests use. */
export const NYS = "dict-nys" as DataDictionary.Id;

/** A coded entry with a three-value list. */
export const SEX_ENTRY = {
  id: "entry-sex" as DataDictionaryEntry.Id,
  name: "sex",
  description: "Sex recorded on the case report.",
} as DataDictionaryEntry.T;

/** `1 Male`, `2 Female`, `9 Unknown (missing)`, with `M` and `F` accepted. */
export const SEX_LIST = {
  id: "list-sex" as DataDictionaryCodeList.Id,
  dictionaryId: NYS,
  name: "Sex (1/2/9)",
  isOrdered: false,
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: ["M"], isMissing: false },
    { code: "2", label: "Female", acceptedSpellings: ["F"], isMissing: false },
    { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
  ],
} as DataDictionaryCodeList.T;

/** A coded column. */
export const GENDER = {
  id: "col-gender" as DatasetColumn.Id,
  name: "GENDER",
  dataType: "bigint",
  columnIdx: 0,
  dictionaryBindingId: undefined,
} as DatasetColumn.T;

/** A column no dictionary matches. */
export const COUNTY = {
  id: "col-county" as DatasetColumn.Id,
  name: "county",
  dataType: "varchar",
  columnIdx: 1,
  dictionaryBindingId: undefined,
} as DatasetColumn.T;

/** GENDER converted with the sex list, codes to labels. */
export const SEX_PICK: ColumnPick = {
  dictionaryId: NYS,
  entryId: SEX_ENTRY.id,
  codeListId: SEX_LIST.id,
  direction: "decode",
  mode: "convert",
  isDirectionFromData: true,
  keepsOriginal: false,
};

/** An upload a workspace admin can link but not yet change in place. */
export const LINKED_ONLY_TARGETS: ApplyTargets = {
  isLinkedDataset: false,
  linked: { isAvailable: true },
  inPlace: { isAvailable: false, reason: "not_an_upload", storage: undefined },
  isAlreadyConvertedInPlace: false,
};

/** Lookups that know the NYS dictionary, the sex entry, and its list. */
export function makeApplyLookups(): ApplyLookups {
  return {
    dictionaryNames: new Map([[NYS, "NYS codes"]]),
    entries: new Map([[SEX_ENTRY.id, SEX_ENTRY]]),
    codeLists: new Map([[SEX_LIST.id, SEX_LIST]]),
  };
}

/** A matched flow over GENDER and COUNTY, with `overrides` laid on top. */
export function makeApplyFlow(overrides: Partial<ApplyFlow> = {}): ApplyFlow {
  return {
    state: {
      ...makeInitialApplyState(),
      dictionaryIds: [NYS],
      picks: { [GENDER.id]: SEX_PICK },
      selectedColumnId: GENDER.id,
      defaultMode: "convert",
      saveTarget: "linked",
    },
    dispatch: vi.fn(),
    rows: [{ column: GENDER, profile: undefined, matches: [] }],
    unmatchedRows: [{ column: COUNTY, profile: undefined, matches: [] }],
    addDictionary: vi.fn(),
    isMatching: false,
    hasReadFailed: false,
    targets: LINKED_ONLY_TARGETS,
    unmatched: { status: "ready", result: new Map() },
    ...overrides,
  };
}
