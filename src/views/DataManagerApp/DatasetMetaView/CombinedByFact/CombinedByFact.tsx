import { Link } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCombiningCrosswalk } from "@/hooks/crosswalks/useCombiningCrosswalk/useCombiningCrosswalk";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
};

/**
 * The rail fact naming the crosswalk that combined this dataset: a link
 * for crosswalk editors, its name for everyone else. Renders nothing for
 * a dataset no crosswalk combined.
 */
export function CombinedByFact({ datasetId }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const canEditCrosswalks = useHasPermission(
    "data_sources__can_edit_crosswalks",
  );
  const { crosswalk } = useCombiningCrosswalk(datasetId);
  if (!crosswalk) {
    return null;
  }
  const link = AppLinks.dataManagerCrosswalkView({
    workspaceSlug: workspace.slug,
    crosswalkId: crosswalk.id,
    crosswalkName: crosswalk.name,
  });
  return (
    <AppViewRail.Fact label={t`Combined by`}>
      {canEditCrosswalks ? (
        <Link to={link.to} params={link.params} search={link.search} size="sm">
          {crosswalk.name}
        </Link>
      ) : (
        crosswalk.name
      )}
    </AppViewRail.Fact>
  );
}
