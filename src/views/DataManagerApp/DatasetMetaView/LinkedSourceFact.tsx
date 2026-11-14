import { Link } from "@avandar/ui";
import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  /** The virtual dataset's `linkedSourceDatasetId`. */
  linkedSourceDatasetId: Dataset.Id | undefined;
  columnCodes: ReadonlyMap<string, ColumnCodes.T>;
};

/**
 * Whether any column converts as it loads. Only a linked dataset holds
 * live conversions, so a virtual dataset with one and no source id is a
 * linked dataset whose source was deleted.
 */
function _hasLiveConversions(
  columnCodes: ReadonlyMap<string, ColumnCodes.T>,
): boolean {
  return [...columnCodes.values()].some((codes) => {
    return codes.mode === "convert" && !codes.isPinned;
  });
}

/**
 * The rail fact naming the dataset a linked dataset reads, linked to it,
 * or saying it was deleted. Renders nothing for a virtual dataset that is
 * not linked.
 */
export function LinkedSourceFact({
  linkedSourceDatasetId,
  columnCodes,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [sourceDatasets] = DatasetClient.useGetAll({
    ...where("id", "in", linkedSourceDatasetId ? [linkedSourceDatasetId] : []),
    useQueryOptions: { enabled: linkedSourceDatasetId !== undefined },
  });
  if (linkedSourceDatasetId === undefined) {
    return _hasLiveConversions(columnCodes) ? (
      <AppViewRail.Fact label={t`Reads`}>
        <Trans>The dataset it reads was deleted.</Trans>
      </AppViewRail.Fact>
    ) : null;
  }
  const sourceDataset = sourceDatasets?.[0];
  if (!sourceDataset) {
    return null;
  }
  const link = AppLinks.dataManagerDatasetView({
    workspaceSlug: workspace.slug,
    datasetId: sourceDataset.id,
    datasetName: sourceDataset.name,
  });
  return (
    <AppViewRail.Fact label={t`Reads`}>
      <Link to={link.to} params={link.params} size="sm">
        {sourceDataset.name}
      </Link>
    </AppViewRail.Fact>
  );
}
