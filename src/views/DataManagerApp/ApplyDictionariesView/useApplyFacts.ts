import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

/** How many columns each kind of pick covers. */
export type ApplyCounts = {
  /** Columns getting a code list. */
  attachedCount: number;
  /** Columns getting only a description. */
  describedCount: number;
  /** Dictionaries at least one pick comes from. */
  usedDictionaryCount: number;
};

/** Counts the picks: code lists, descriptions, and dictionaries used. */
export function countPicks(
  picks: Readonly<Record<string, ColumnPick>>,
): ApplyCounts {
  const all = Object.values(picks);
  const attachedCount = all.filter((pick) => {
    return pick.codeListId !== undefined;
  }).length;
  return {
    attachedCount,
    describedCount: all.length - attachedCount,
    usedDictionaryCount: new Set(
      all.map((pick) => {
        return pick.dictionaryId;
      }),
    ).size,
  };
}

/**
 * The apply header's facts: `1 attached as reference · 3 described · of 22
 * columns · from 2 of 2 dictionaries`. Counts that are zero are left out.
 */
export function useApplyFacts(
  options: Readonly<{
    counts: ApplyCounts;
    columnCount: number;
    dictionaryCount: number;
  }>,
): string[] {
  const { t, i18n } = useLingui();
  const { attachedCount, describedCount } = options.counts;
  const usedText = i18n.number(options.counts.usedDictionaryCount);
  const attachedText = plural(attachedCount, {
    one: "# attached as reference",
    other: "# attached as reference",
  });
  const describedText = plural(describedCount, {
    one: "# described",
    other: "# described",
  });
  const columnsText = plural(options.columnCount, {
    one: "of # column",
    other: "of # columns",
  });
  const dictionariesText = plural(options.dictionaryCount, {
    one: `from ${usedText} of # dictionary`,
    other: `from ${usedText} of # dictionaries`,
  });
  const pickedFacts = [
    ...(attachedCount > 0 ? [attachedText] : []),
    ...(describedCount > 0 ? [describedText] : []),
  ];
  return [
    ...(pickedFacts.length > 0 ? pickedFacts : [t`Nothing picked yet`]),
    columnsText,
    dictionariesText,
  ];
}
