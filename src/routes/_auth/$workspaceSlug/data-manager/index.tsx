import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Center } from "@mantine/core";
import { IconDatabaseSearch, IconFileImport, IconPlus } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

export const Route = createFileRoute("/_auth/$workspaceSlug/data-manager/")({
  component: DataManagerRoot,
});

/**
 * The detail region before a dataset is picked.
 *
 * A workspace with no datasets gets the activation state instead of the
 * selection one: telling someone to choose from an empty list is the failure
 * this view exists to avoid.
 */
function DataManagerRoot(): JSX.Element {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [allDatasets, isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  if (isLoadingDatasets) {
    return <Center flex={1} />;
  }

  const hasDatasets = (allDatasets?.length ?? 0) > 0;

  return (
    <Center flex={1} p="lg" mih={0} style={{ overflow: "auto" }}>
      {hasDatasets ? (
        <AppSlateEmptyState
          icon={<IconDatabaseSearch size={32} stroke={1.5} aria-hidden />}
          title={t`Select a dataset`}
          message={
            <Trans>
              Pick one from the list to review its columns, preview its rows,
              and read a summary of what is in it.
            </Trans>
          }
          action={
            <Button
              variant="default"
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                navigate(AppLinks.dataImport(workspace.slug));
              }}
            >
              <Trans>Add new dataset</Trans>
            </Button>
          }
        />
      ) : (
        <AppSlateEmptyState
          icon={<IconFileImport size={32} stroke={1.5} aria-hidden />}
          title={t`Bring in your first dataset`}
          message={
            <Trans>
              Upload a CSV, Excel, or PDF file, connect a Google Sheet, or
              browse the open data catalog. Everything else in Avandar builds
              on what you import here.
            </Trans>
          }
          action={
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                navigate(AppLinks.dataImport(workspace.slug));
              }}
            >
              <Trans>Import data</Trans>
            </Button>
          }
        />
      )}
    </Center>
  );
}
