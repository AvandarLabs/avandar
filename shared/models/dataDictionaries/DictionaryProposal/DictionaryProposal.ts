/* oxlint-disable typescript/no-namespace, import/export */
import type {
  DictionaryProposalCodeList,
  DictionaryProposalCodeListStatus,
  DictionaryProposalCodings,
  DictionaryProposalEntry,
  DictionaryProposalEntryNameIssue,
  DictionaryProposalLabels,
  DictionaryProposalLabelSuggestions,
  DictionaryProposalMeaningMatch,
  DictionaryProposalSuggestionReason,
  DictionaryProposalT,
  DictionaryProposalValueLabel,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

export { DictionaryProposalModule as DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/DictionaryProposalModule.ts";

/** Public namespace for a dictionary learned from datasets, before saving. */
export namespace DictionaryProposal {
  export type T = DictionaryProposalT;
  export type Entry = DictionaryProposalEntry;
  export type EntryNameIssue = DictionaryProposalEntryNameIssue;
  export type SuggestionReason = DictionaryProposalSuggestionReason;
  export type CodeList = DictionaryProposalCodeList;
  export type Codings = DictionaryProposalCodings;
  export type ValueLabel = DictionaryProposalValueLabel;
  export type Labels = DictionaryProposalLabels;
  export type CodeListStatus = DictionaryProposalCodeListStatus;
  export type MeaningMatch = DictionaryProposalMeaningMatch;
  export type LabelSuggestions = DictionaryProposalLabelSuggestions;
}
