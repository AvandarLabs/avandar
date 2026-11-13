import { useLingui } from "@lingui/react/macro";
import type { ApplyStep } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

/** The name of each apply step, as the step bar and its heading say it. */
export function useApplyStepLabels(): Record<ApplyStep, string> {
  const { t } = useLingui();
  return { match: t`Match columns`, attach: t`Attach` };
}
