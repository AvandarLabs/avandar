import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { isConvertingPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

/** How many columns each kind of pick covers. */
export type ApplyCounts = {
  /** Columns whose values convert. */
  convertedCount: number;
  /** Columns getting a code list as reference. */
  attachedCount: number;
  /** Columns getting only a description. */
  describedCount: number;
  /** Dictionaries at least one pick comes from. */
  usedDictionaryCount: number;
};

/**
 * Counts the picks: conversions, code lists, descriptions, and dictionaries
 * used.
 */
export function countPicks(
  picks: Readonly<Record<string, ColumnPick>>,
): ApplyCounts {
  const all = Object.values(picks);
  const convertedCount = all.filter(isConvertingPick).length;
  const codedCount = all.filter((pick) => {
    return pick.codeListId !== undefined;
  }).length;
  return {
    convertedCount,
    attachedCount: codedCount - convertedCount,
    describedCount: all.length - codedCount,
    usedDictionaryCount: new Set(
      all.map((pick) => {
        return pick.dictionaryId;
      }),
    ).size,
  };
}

/** The facts about the picks, each left out when it is zero. */
function usePickedFacts(counts: Readonly<ApplyCounts>): string[] {
  const { convertedCount, attachedCount, describedCount } = counts;
  const convertedText = plural(convertedCount, {
    one: "# converted",
    other: "# converted",
  });
  const attachedText = plural(attachedCount, {
    one: "# attached as reference",
    other: "# attached as reference",
  });
  const describedText = plural(describedCount, {
    one: "# described",
    other: "# described",
  });
  return [
    ...(convertedCount > 0 ? [convertedText] : []),
    ...(attachedCount > 0 ? [attachedText] : []),
    ...(describedCount > 0 ? [describedText] : []),
  ];
}

/**
 * The apply header's facts: `6 converted · 1 attached as reference · 3
 * described · of 22 columns · from 2 of 2 dictionaries`. Counts that are
 * zero are left out.
 */
export function useApplyFacts(
  options: Readonly<{
    counts: ApplyCounts;
    columnCount: number;
    dictionaryCount: number;
  }>,
): string[] {
  const { t, i18n } = useLingui();
  const pickedFacts = usePickedFacts(options.counts);
  const usedText = i18n.number(options.counts.usedDictionaryCount);
  const columnsText = plural(options.columnCount, {
    one: "of # column",
    other: "of # columns",
  });
  const dictionariesText = plural(options.dictionaryCount, {
    one: `from ${usedText} of # dictionary`,
    other: `from ${usedText} of # dictionaries`,
  });
  return [
    ...(pickedFacts.length > 0 ? pickedFacts : [t`Nothing picked yet`]),
    columnsText,
    dictionariesText,
  ];
}
