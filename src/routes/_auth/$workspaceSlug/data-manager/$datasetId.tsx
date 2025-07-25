import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { DatasetMetaView } from "@/components/DataManagerApp/DatasetMetaView";
import { Logger } from "@/lib/Logger";
import { Callout } from "@/lib/ui/Callout";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { asLocalDatasetId } from "@/models/LocalDataset/utils";
import type { LocalDataset } from "@/models/LocalDataset/types";

export const Route = createFileRoute("/_auth/$workspaceSlug/data-manager/$datasetId")({
  component: RouteComponent,
  loader: async ({ params: { datasetId } }): Promise<LocalDataset> => {
    const dataset = await LocalDatasetClient.getById({
      id: asLocalDatasetId(datasetId),
    });
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
