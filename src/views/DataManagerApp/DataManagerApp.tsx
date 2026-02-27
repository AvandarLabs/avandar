import { Button, Flex, MantineTheme, ScrollArea } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { where } from "$/lib/utils/filters/filters";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { AppLayout } from "@/components/common/layouts/AppLayout";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DatasetNavbar } from "./DatasetNavbar";

export function DataManagerApp(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [allDatasets, isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const navigate = useNavigate();

  return (
    <AppLayout
      title="Data Sources"
      toolbarButtonSection={
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => {
            navigate(AppLinks.dataImport(workspace.slug));
          }}
          size="compact-sm"
          variant="light"
        >
          Add new dataset
        </Button>
      }
    >
      <Flex align="stretch" h="100%">
        <DatasetNavbar
          miw={240}
          isLoading={isLoadingDatasets}
          datasets={allDatasets ?? []}
          style={$datasetNavbarBorder}
        />
        <ScrollArea h="100%" w="100%">
          <Outlet />
        </ScrollArea>
      </Flex>
    </AppLayout>
  );
}

const $datasetNavbarBorder = (theme: MantineTheme) => {
  return {
    borderRight: `1px solid ${theme.colors.neutral[2]}`,
    alignSelf: "stretch",
  };
};
