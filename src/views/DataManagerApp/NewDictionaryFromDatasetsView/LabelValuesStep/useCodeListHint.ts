import { useLingui } from "@lingui/react/macro";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";

/**
 * One sentence on how to label a code list: that a shared list is labeled
 * once for every entry on it, that an ordered list keeps its order, or what
 * a label is for.
 */
export function useCodeListHint(
  codeList: DictionaryProposal.CodeList,
  entries: readonly DictionaryProposal.Entry[],
): string {
  const { t, i18n } = useLingui();
  if (entries.length > 1) {
    const names = new Intl.ListFormat(i18n.locale, {
      type: "conjunction",
    }).format(
      entries.map((entry) => {
        return entry.name;
      }),
    );
    return t`${names} hold the same values, so they share this one list. Label it once.`;
  }
  return codeList.isOrdered
    ? t`This list is ordered, lowest level first. Reorder it on the dictionary after saving if the order is wrong.`
    : t`Give each value the label people should see. Suggestions are only a starting point.`;
}
