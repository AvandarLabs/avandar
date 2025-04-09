import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { LocalDatasetClient } from "@/clients/LocalDatasetClient";
import { DatasetMetaView } from "@/components/DataManagerApp/DatasetMetaView/DatasetMetaView";
import { Logger } from "@/lib/Logger";
import { Callout } from "@/lib/ui/Callout";
import { type LocalDataset } from "@/models/LocalDataset";

export const Route = createFileRoute("/_auth/data-manager/$datasetId")({
  component: RouteComponent,
  loader: async ({ params: { datasetId } }): Promise<LocalDataset> => {
    const dataset = await LocalDatasetClient.getDataset(Number(datasetId));
    if (!dataset) {
      throw notFound();
    }
    return dataset;
  },
  errorComponent: DatasetMetaErrorView,
});

function RouteComponent() {
  const dataset = Route.useLoaderData();
  return <DatasetMetaView dataset={dataset} />;
}

function DatasetMetaErrorView({ error }: ErrorComponentProps) {
  useEffect(() => {
    Logger.error(error);
  }, [error]);

  return (
    <Center h="50%">
      <Callout
        title="Dataset failed to load"
        message="The dataset failed to load. Please try again later or reach out to support."
      />
    </Center>
  );
}
