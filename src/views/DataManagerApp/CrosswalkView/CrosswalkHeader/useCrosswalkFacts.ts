import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

/**
 * The crosswalk header's facts: `Crosswalk · 100 datasets · 10 columns ·
 * Reference: <layout>`. The reference is named by its first dataset, and
 * left out until there is one.
 */
export function useCrosswalkFacts(
  options: Readonly<{ draft: CrosswalkDraft.T; context: CrosswalkContext }>,
): Array<string | undefined> {
  const { t } = useLingui();
  const { draft, context } = options;
  const datasetCount = CrosswalkDraft.getDatasetIds(draft).length;
  const datasetsText = plural(datasetCount, {
    one: "# dataset",
    other: "# datasets",
  });
  const columnsText = plural(draft.columns.length, {
    one: "# column",
    other: "# columns",
  });
  const firstId = CrosswalkDraft.getReferenceLayout(draft)?.datasetIds[0];
  const layoutName = firstId
    ? context.datasetsById.get(firstId)?.name
    : undefined;
  return [
    t`Crosswalk`,
    datasetsText,
    columnsText,
    layoutName ? t`Reference: ${layoutName}` : undefined,
  ];
}
