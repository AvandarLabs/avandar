import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { DatasetNavbar } from "./DatasetNavbar";
import { useGetAllLocalDatasets } from "./queries";

export function DataManagerApp(): JSX.Element {
  const [allDatasets, isLoadingDatasets] = useGetAllLocalDatasets();

  return (
    <Flex>
      {allDatasets ?
        <DatasetNavbar
          miw={240}
          h="100dvh"
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
