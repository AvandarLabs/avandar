import { Link } from "@avandar/ui";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = Readonly<{
  /** The item's title, already localized, which names the link. */
  title: string;
  datasetId: Dataset.Id;
}>;

/**
 * An imported content item on a plugin's card, linked to its dataset's page
 * in Data Sources, so an admin can open what the plugin brought in.
 */
export function PluginContentDatasetLink({
  title,
  datasetId,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const { to, params } = AppLinks.dataManagerDatasetView({
    workspaceSlug: workspace.slug,
    datasetId,
    datasetName: title,
  });
  return (
    <Link to={to} params={params} size="sm" w="fit-content">
      {title}
    </Link>
  );
}
