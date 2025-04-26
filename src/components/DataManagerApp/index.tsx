import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { DatasetNavbar } from "./DatasetNavbar";

export function DataManagerApp(): JSX.Element {
  const [allDatasets, isLoadingDatasets] = LocalDatasetClient.useGetAll();

  return (
    <Flex>
      {allDatasets ?
        <DatasetNavbar
          miw={240}
          mih="100dvh"
          isLoading={isLoadingDatasets}
          datasets={allDatasets}
          style={$datasetNavbarBorder}
        />
      : null}

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
