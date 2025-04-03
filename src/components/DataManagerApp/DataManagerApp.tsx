import { Grid } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { DatasetLinkList } from "./DatasetLinkList";
import { useGetAllLocalDatasets } from "./queries";

export function DataManagerApp(): JSX.Element {
  const [allDatasets, isLoadingDatasets] = useGetAllLocalDatasets();

  return (
    <Grid>
      <Grid.Col
        span={3}
        style={(theme) => {
          return {
            backgroundColor: "white",
            borderRight: `1px solid ${theme.colors.neutral[1]}`,
            height: "100dvh",
          };
        }}
        p={0}
      >
        {allDatasets ?
          <DatasetLinkList
            isLoading={isLoadingDatasets}
            datasets={allDatasets}
          />
        : null}
      </Grid.Col>

      <Grid.Col span={9}>
        <Outlet />
      </Grid.Col>
    </Grid>
  );
}
