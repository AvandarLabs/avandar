import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";

/** The three groups the Review step sorts proposed entries into. */
export type ReviewSection = "coded" | "ordered" | "description";

/** Which Review group an entry of this kind belongs to. */
export function getReviewSectionFromKind(
  kind: DataDictionaryEntry.Kind,
): ReviewSection {
  if (kind === "categorical") {
    return "coded";
  }
  return kind === "ordered" ? "ordered" : "description";
}

/** For each entry on a shared code list, the other entries on it. */
export function getSharedNamesByEntryKey(
  proposal: DictionaryProposal.T,
): Map<string, string[]> {
  const namesByKey = new Map(
    proposal.entries.map((entry) => {
      return [entry.key, entry.name];
    }),
  );
  const shared = new Map<string, string[]>();
  DictionaryProposal.getCodings(proposal)
    .codeLists.filter((codeList) => {
      return codeList.entryKeys.length > 1;
    })
    .forEach((codeList) => {
      codeList.entryKeys.forEach((entryKey) => {
        const others = codeList.entryKeys.filter((other) => {
          return other !== entryKey;
        });
        shared.set(
          entryKey,
          others.flatMap((other) => {
            return namesByKey.get(other) ?? [];
          }),
        );
      });
    });
  return shared;
}
