import { Link } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  facts: readonly string[];
};

/**
 * The apply flow's header band: a breadcrumb back to the dataset the
 * dictionaries are for, how many columns each kind of pick covers, and
 * Cancel, which goes back to the dataset.
 */
export function ApplyDictionariesHeader({
  dataset,
  facts,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const datasetName = dataset.name;
  const datasetLink = AppLinks.dataManagerDatasetView({
    workspaceSlug: workspace.slug,
    datasetId: dataset.id,
    datasetName,
  });
  return (
    <AppViewHeader
      breadcrumb={
        <nav aria-label={t`Breadcrumb`}>
          <Link to={datasetLink.to} params={datasetLink.params} size="xs">
            {datasetName}
          </Link>
          <span aria-hidden> ›</span>
        </nav>
      }
      title={t`Apply dictionaries`}
      facts={facts}
      actions={
        <Button
          variant="default"
          onClick={() => {
            navigate(datasetLink);
          }}
        >
          <Trans>Cancel</Trans>
        </Button>
      }
    />
  );
}
