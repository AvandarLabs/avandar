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
 * The apply flow's header band: which dataset the dictionaries are for, how
 * many columns each kind of pick covers, and Cancel, which goes back to the
 * dataset.
 */
export function ApplyDictionariesHeader({
  dataset,
  facts,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const datasetName = dataset.name;
  return (
    <AppViewHeader
      title={t`Apply dictionaries to ${datasetName}`}
      facts={facts}
      actions={
        <Button
          variant="default"
          onClick={() => {
            navigate(
              AppLinks.dataManagerDatasetView({
                workspaceSlug: workspace.slug,
                datasetId: dataset.id,
                datasetName,
              }),
            );
          }}
        >
          <Trans>Cancel</Trans>
        </Button>
      }
    />
  );
}
