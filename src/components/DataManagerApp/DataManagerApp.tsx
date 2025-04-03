import { Grid } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { DatasetNavbar } from "./DatasetNavbar";
import { useGetAllLocalDatasets } from "./queries";

export function DataManagerApp(): JSX.Element {
  const [allDatasets, isLoadingDatasets] = useGetAllLocalDatasets();

  return (
    <Grid>
      <Grid.Col
        span={3}
        h="100dvh"
        style={(theme) => {
          return {
            borderRight: `1px solid ${theme.colors.neutral[1]}`,
          };
        }}
        p={0}
      >
        {allDatasets ?
          <DatasetNavbar isLoading={isLoadingDatasets} datasets={allDatasets} />
        : null}
      </Grid.Col>

      <Grid.Col span={9}>
        <Outlet />
      </Grid.Col>
    </Grid>
  );
}
