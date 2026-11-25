import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";

/**
 * Whether the user wrote this entry's description. Text that is still the
 * model's own suggestion is not theirs to protect, so a new suggestion
 * replaces it without asking.
 */
export function hasWrittenDescription(
  entry: Readonly<DictionaryProposal.Entry>,
): boolean {
  return entry.description.trim() !== "" && !entry.isDescriptionSuggested;
}
