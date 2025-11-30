import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { where } from "$/lib/utils/filters/filters";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DatasetNavbar } from "./DatasetNavbar";

export function DataManagerApp(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [allDatasets, isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  return (
    <Flex>
      <DatasetNavbar
        miw={240}
        mih="100dvh"
        isLoading={isLoadingDatasets}
        datasets={allDatasets ?? []}
        style={$datasetNavbarBorder}
      />
      <Box flex={1}>
        <Outlet />
      </Box>
    </Flex>
  );
}

const $datasetNavbarBorder = (theme: MantineTheme) => {
  return {
    borderRight: `1px solid ${theme.colors.neutral[2]}`,
  };
};
