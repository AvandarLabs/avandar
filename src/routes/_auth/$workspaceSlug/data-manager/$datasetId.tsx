import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetMetaView } from "@/components/DataManagerApp/DatasetMetaView";
import { Logger } from "@/lib/Logger";
import { Callout } from "@/lib/ui/Callout";
import { Dataset, DatasetId } from "@/models/datasets/Dataset";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/$datasetId",
)({
  component: RouteComponent,
  loader: async ({ params: { datasetId } }): Promise<Dataset> => {
    const dataset = await DatasetClient.getById({
      id: datasetId as DatasetId,
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
