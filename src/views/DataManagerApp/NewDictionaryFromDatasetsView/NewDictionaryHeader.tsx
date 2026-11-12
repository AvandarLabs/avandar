import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  /** The dataset Cancel returns to, when the flow started from one. */
  cancelDatasetId: Dataset.Id | undefined;
  /** Set while the flow is learning from that one dataset. */
  originDatasetName: string | undefined;
};

/**
 * The header band of learning a dictionary: what is being made, one line
 * on what happens to it, and Cancel, which goes back where the flow began.
 */
export function NewDictionaryHeader({
  cancelDatasetId,
  originDatasetName,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const isFromDataset = originDatasetName !== undefined;
  const onCancel = (): void => {
    if (!cancelDatasetId) {
      navigate(AppLinks.dataManagerHome(workspace.slug));
      return;
    }
    navigate(
      AppLinks.dataManagerDatasetView({
        workspaceSlug: workspace.slug,
        datasetId: cancelDatasetId,
        datasetName: originDatasetName ?? "",
      }),
    );
  };

  return (
    <AppViewHeader
      title={
        isFromDataset
          ? t`New dictionary from ${originDatasetName}`
          : t`New dictionary from datasets`
      }
      description={
        isFromDataset
          ? t`Saved to Dictionaries, so any dataset can use it.`
          : t`Avandar learns the codes your datasets use and what their columns mean.`
      }
      actions={
        <Button variant="default" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      }
    />
  );
}
