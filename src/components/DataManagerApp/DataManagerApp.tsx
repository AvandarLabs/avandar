import { Box, Flex } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { DatasetNavbar } from "./DatasetNavbar";
import { useGetAllLocalDatasets } from "./queries";

export function DataManagerApp(): JSX.Element {
  const [allDatasets, isLoadingDatasets] = useGetAllLocalDatasets();

  return (
    <Flex>
      <Box
        miw={240}
        h="100dvh"
        style={(theme) => {
          return {
            borderRight: `1px solid ${theme.colors.neutral[1]}`,
          };
        }}
      >
        {allDatasets ?
          <DatasetNavbar isLoading={isLoadingDatasets} datasets={allDatasets} />
        : null}
      </Box>

      <Box flex={1}>
        <Outlet />
      </Box>
    </Flex>
  );
}
