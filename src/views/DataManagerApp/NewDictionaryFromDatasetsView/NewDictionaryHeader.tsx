import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  /** The dataset Cancel returns to, when the flow started from one that exists. */
  cancelDatasetId: Dataset.Id | undefined;
  /** The name of the dataset Cancel returns to, once it is found. */
  cancelDatasetName: string | undefined;
  /** Whether the flow is learning from the one dataset that opened it. */
  isFromDataset: boolean;
  /** That dataset's name. Undefined until it is found. */
  originDatasetName: string | undefined;
};

/** The header's title. The dataset's name is not known until datasets load. */
function useHeaderTitle(
  options: Readonly<{
    isFromDataset: boolean;
    originDatasetName: string | undefined;
  }>,
): string {
  const { t } = useLingui();
  const { isFromDataset, originDatasetName } = options;
  if (!isFromDataset) {
    return t`New dictionary from datasets`;
  }
  return originDatasetName
    ? t`New dictionary from ${originDatasetName}`
    : t`New dictionary`;
}

/**
 * The header band of learning a dictionary: what is being made, one line
 * on what happens to it, and Cancel, which goes back where the flow began.
 */
export function NewDictionaryHeader({
  cancelDatasetId,
  cancelDatasetName,
  isFromDataset,
  originDatasetName,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const title = useHeaderTitle({ isFromDataset, originDatasetName });
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const onCancel = (): void => {
    if (!cancelDatasetId) {
      navigate(AppLinks.dataManagerHome(workspace.slug));
      return;
    }
    navigate(
      AppLinks.dataManagerDatasetView({
        workspaceSlug: workspace.slug,
        datasetId: cancelDatasetId,
        datasetName: cancelDatasetName ?? "",
      }),
    );
  };

  return (
    <AppViewHeader
      title={title}
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
