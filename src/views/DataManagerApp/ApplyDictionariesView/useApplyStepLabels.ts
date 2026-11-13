import { useLingui } from "@lingui/react/macro";
import type { ApplyStep } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

/**
 * The name of each apply step, as the step bar and its heading say it:
 * Unmatched values with its count once read, and the last step Save as
 * when a column converts, Save for a linked dataset's own conversions, and
 * Attach when nothing converts.
 */
export function useApplyStepLabels(
  options: Readonly<{
    isConverting: boolean;
    isLinkedDataset: boolean;
    /** Values no pair matches; undefined while they are read. */
    unmatchedCount: number | undefined;
  }>,
): Record<ApplyStep, string> {
  const { t, i18n } = useLingui();
  const countText =
    options.unmatchedCount === undefined
      ? undefined
      : i18n.number(options.unmatchedCount);
  const save = !options.isConverting
    ? t`Attach`
    : options.isLinkedDataset
      ? t`Save`
      : t`Save as`;
  return {
    match: t`Match columns`,
    unmatched:
      countText === undefined
        ? t`Unmatched values`
        : t`Unmatched values (${countText})`,
    save,
  };
}
