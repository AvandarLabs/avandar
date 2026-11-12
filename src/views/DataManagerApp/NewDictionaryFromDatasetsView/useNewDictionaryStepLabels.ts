import { useLingui } from "@lingui/react/macro";
import type { NewDictionaryStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";

/**
 * The name of each step of learning a dictionary, shown on the step bar and
 * as the heading that takes focus when the step changes.
 */
export function useNewDictionaryStepLabels(): Record<
  NewDictionaryStep,
  string
> {
  const { t } = useLingui();
  return {
    pick: t`Pick datasets`,
    review: t`Review columns`,
    label: t`Label values`,
    save: t`Save`,
  };
}
