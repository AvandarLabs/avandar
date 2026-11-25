import { useLingui } from "@lingui/react/macro";
import { getLayoutLabel } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/getLayoutLabel";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

/**
 * A function giving each layout's name as one translated string, for a
 * Select option or an accessible name, where the two-line `LayoutName`
 * does not fit.
 */
export function useLayoutNamer(
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>,
): (layout: Pick<CrosswalkDraft.Layout, "datasetIds">) => string {
  const { t } = useLingui();
  return (layout) => {
    return (
      getLayoutLabel(layout, datasetsById).firstDatasetName ??
      t`No datasets left`
    );
  };
}
