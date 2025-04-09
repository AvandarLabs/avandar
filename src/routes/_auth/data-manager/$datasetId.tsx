import { Alert, Center, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { LocalDatasetClient } from "@/clients/LocalDatasetClient";
import { DatasetMetaView } from "@/components/DataManagerApp/DatasetMetaView/DatasetMetaView";
import { Logger } from "@/lib/Logger";
import * as LocalDataset from "@/models/LocalDataset";

export const Route = createFileRoute("/_auth/data-manager/$datasetId")({
  component: RouteComponent,
  loader: async ({ params: { datasetId } }): Promise<LocalDataset.T> => {
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
      <Alert
        variant="light"
        color="danger"
        title={<Title order={4}>Dataset failed to load</Title>}
        icon={<IconAlertCircle />}
      >
        <Text>
          The dataset failed to load. Please try again later or reach out to
          support.
        </Text>
      </Alert>
    </Center>
  );
}
