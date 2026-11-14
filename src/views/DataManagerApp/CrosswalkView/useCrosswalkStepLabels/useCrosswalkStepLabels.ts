import { useLingui } from "@lingui/react/macro";
import type { CrosswalkStep } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

/**
 * The name of each crosswalk step, as the step bar and its heading say it.
 * The last step is Update combined dataset once the crosswalk has one.
 */
export function useCrosswalkStepLabels(
  options: Readonly<{ hasCombinedDataset: boolean }>,
): Record<CrosswalkStep, string> {
  const { t } = useLingui();
  return {
    datasets: t`Choose datasets`,
    map: t`Map each dataset`,
    combine: options.hasCombinedDataset
      ? t`Update combined dataset`
      : t`Create combined dataset`,
  };
}
