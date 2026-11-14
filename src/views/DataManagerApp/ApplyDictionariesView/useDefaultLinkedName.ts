import { useLingui } from "@lingui/react/macro";
import { isConvertingPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

/**
 * The name a new linked dataset is offered: `<dataset> (labeled)` when
 * every converted column turns codes into labels, `(coded)` when every one
 * turns labels into codes, and `(converted)` for a mix.
 */
export function useDefaultLinkedName(
  datasetName: string,
  picks: Readonly<Record<string, ColumnPick>>,
): string {
  const { t } = useLingui();
  const directions = new Set(
    Object.values(picks)
      .filter(isConvertingPick)
      .map((pick) => {
        return pick.direction;
      }),
  );
  if (directions.size === 1 && directions.has("encode")) {
    return t`${datasetName} (coded)`;
  }
  return directions.size > 1
    ? t`${datasetName} (converted)`
    : t`${datasetName} (labeled)`;
}
