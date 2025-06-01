import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { useMemo } from "react";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { isDatasetViewableType } from "@/models/LocalDataset/utils";
import { DatasetNavbar } from "./DatasetNavbar";

export function DataManagerApp(): JSX.Element {
  const [allDatasets, isLoadingDatasets] = LocalDatasetClient.useGetAll();

  const viewableDatasets = useMemo(() => {
    return allDatasets?.filter(isDatasetViewableType) ?? [];
  }, [allDatasets]);

  return (
    <Flex>
      {viewableDatasets ?
        <DatasetNavbar
          miw={240}
          mih="100dvh"
          isLoading={isLoadingDatasets}
          datasets={viewableDatasets}
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
