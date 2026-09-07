import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button, Flex } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppSlate } from "@/components/layouts/AppSlate/AppSlate";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DatasetNavbar } from "@/views/DataManagerApp/DatasetNavbar";

export function DataManagerApp(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [allDatasets, isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const navigate = useNavigate();
  const { t } = useLingui();

  return (
    <AppSlate
      title={t`Data Sources`}
      toolbarButtonSection={
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => {
            navigate(AppLinks.dataImport(workspace.slug));
          }}
          size="compact-sm"
          variant="light"
        >
          {t`Add new dataset`}
        </Button>
      }
    >
      {
        // The routed view owns its own scrolling so its header band can stay
        // put while the content moves under it. Wrapping the outlet in a
        // scroll container here would scroll the band away with it.
      }
      <Flex align="stretch" h="100%" mih={0}>
        <DatasetNavbar
          isLoading={isLoadingDatasets}
          datasets={allDatasets ?? []}
        />
        <Flex direction="column" flex={1} miw={0} mih={0}>
          <Outlet />
        </Flex>
      </Flex>
    </AppSlate>
  );
}
