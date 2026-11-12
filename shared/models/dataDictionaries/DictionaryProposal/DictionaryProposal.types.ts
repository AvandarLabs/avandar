import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";

/**
 * Why columns were put in one entry by a guess the user can undo with Keep
 * apart:
 * - `similar_name`: the scorer rated the pair a suggestion (0.6 to 0.9).
 * - `other_codes`: the same name with values that do not overlap, such as
 *   GENDER holding 1, 2, 9 and sex holding M, F, U. They become two code
 *   lists on one entry.
 * - `meaning`: the suggestion model said they record the same thing.
 */
export type DictionaryProposalSuggestionReason =
  | "similar_name"
  | "other_codes"
  | "meaning";

/**
 * One entry the new dictionary would have, learned from one or more dataset
 * columns. The create flow's Review step shows and edits these.
 */
export type DictionaryProposalEntry = {
  /** Stable while the flow runs: the first column's dataset id and name. */
  key: string;
  name: string;
  /** Columns that certainly belong to this entry. */
  columns: ColumnProfile.T[];
  /** Columns joined by a guess, split off again by Keep apart. */
  suggestedColumns: ColumnProfile.T[];
  suggestionReason: DictionaryProposalSuggestionReason | undefined;
  kind: DataDictionaryEntry.Kind;
  /** Unchecked entries are left out of the saved dictionary. */
  isIncluded: boolean;
  description: string;
  /** True while `description` is the suggestion model's and unedited. */
  isDescriptionSuggested: boolean;
};

/** A dictionary learned from datasets, before it is saved. */
export type DictionaryProposalT = {
  entries: DictionaryProposalEntry[];
};

/**
 * A code list the new dictionary would have: one set of values, used by one
 * entry or shared by entries with the same values and the same first word.
 */
export type DictionaryProposalCodeList = {
  /** The entry name's first token and the sorted, normalized codes. */
  key: string;
  name: string;
  isOrdered: boolean;
  /** The entries that use it. */
  entryKeys: string[];
  /** The codes in list order, with how many rows hold each. */
  values: ColumnProfile.Value[];
};

/** Every code list, and each coded entry's code lists, primary first. */
export type DictionaryProposalCodings = {
  codeLists: DictionaryProposalCodeList[];
  codeListKeysByEntryKey: Record<string, string[]>;
};

/**
 * The label a value will be saved with, and where it came from:
 * - `data`: the value already reads as a label, such as `Recovered`.
 * - `suggested`: the suggestion model's, not edited since.
 * - `typed`: the user's. A suggestion never replaces it.
 */
export type DictionaryProposalValueLabel = {
  label: string;
  isMissing: boolean;
  source: "data" | "suggested" | "typed";
};

/** One code list's labels, keyed by normalized code, and its accept state. */
export type DictionaryProposalCodeListLabels = {
  values: Record<string, DictionaryProposalValueLabel>;
  /** Set by Accept and next list. */
  isAccepted: boolean;
};

/** Every code list's labels, keyed by code list key. */
export type DictionaryProposalLabels = Record<
  string,
  DictionaryProposalCodeListLabels
>;

/** How far along a code list is: shown as Labeled, Suggested, or To do. */
export type DictionaryProposalCodeListStatus =
  | "labeled"
  | "suggested"
  | "to_do";

/**
 * Why an entry's name cannot be saved, matching what the save RPC refuses:
 * - `name_required`: blank once trimmed.
 * - `name_not_unique`: the same as another included entry's name, ignoring
 *   case and surrounding spaces.
 */
export type DictionaryProposalEntryNameIssue =
  | "name_required"
  | "name_not_unique";

/** One meaning-based match: entry `name` records the same as `sameAs`. */
export type DictionaryProposalMeaningMatch = {
  name: string;
  sameAs: string;
};

/** The suggestion model's labels for one code list, and a description. */
export type DictionaryProposalLabelSuggestions = {
  labels: Array<{ value: string; label: string; isMissing: boolean }>;
  description: string;
};
