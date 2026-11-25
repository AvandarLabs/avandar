import { Link } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PREVIEW_DRAWER_ID } from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/ApplyPreviewDrawer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode, RefObject } from "react";

type Props = {
  dataset: Dataset.T;
  facts: readonly string[];
  isPreviewOpen: boolean;
  /** False until the columns are matched. */
  isPreviewAvailable: boolean;
  onTogglePreview: () => void;
  /** Focus returns here when the preview closes. */
  previewButtonRef: RefObject<HTMLButtonElement | null>;
};

/**
 * The apply flow's header band: a breadcrumb back to the dataset, what the
 * picks add up to, Preview data, which opens the preview drawer at any
 * step, and Cancel, which goes back to the dataset.
 */
export function ApplyDictionariesHeader(props: Readonly<Props>): ReactNode {
  const { dataset, facts } = props;
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
        <>
          <Button
            ref={props.previewButtonRef}
            variant="default"
            disabled={!props.isPreviewAvailable}
            aria-expanded={props.isPreviewOpen}
            aria-controls={props.isPreviewOpen ? PREVIEW_DRAWER_ID : undefined}
            onClick={props.onTogglePreview}
          >
            <Trans>Preview data</Trans>
          </Button>
          <Button
            variant="default"
            onClick={() => {
              navigate(datasetLink);
            }}
          >
            <Trans>Cancel</Trans>
          </Button>
        </>
      }
    />
  );
}
